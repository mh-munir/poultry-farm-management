'use server';

import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';
import { requireUser } from '@/lib/auth';
import { CACHE_TAGS, revalidateCompanyData } from '@/lib/cache';

const companySchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, 'Company name is required.'),
  contactPerson: z.string().optional(),
  phone: z.string().regex(/^\d{11}$/, 'Mobile number must be exactly 11 numeric digits.'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  companyType: z.enum(['FEED', 'MEDICINE', 'BOTH']).default('FEED'),
  isActive: z.preprocess((val) => val === 'on' || val === true, z.boolean())
});

export async function createCompany(formData: FormData) {
  const session = await requireUser();
  const parsed = companySchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? 'Invalid company data.' };
  }

  const data = parsed.data;

  try {
    const company = await prisma.company.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        companyType: data.companyType,
        isActive: data.isActive,
        createdBy: {
          connect: { id: session.user.id ?? '' }
        }
      }
    });

    revalidateCompanyData(company.id);

    return { success: true as const, message: `Company '${company.name}' created successfully.`, company };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Failed to create company.' };
  }
}

export async function updateCompany(formData: FormData) {
  await requireUser();
  const parsed = companySchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? 'Invalid company data.' };
  }

  const data = parsed.data;
  const id = Number(formData.get('id'));

  if (!id) {
    return { success: false as const, message: 'Company ID is required.' };
  }

  try {
    const company = await prisma.company.update({
      where: { id },
      data: {
        name: data.name,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        companyType: data.companyType,
        isActive: data.isActive
      }
    });

    revalidateCompanyData(company.id);

    return { success: true as const, message: `Company '${company.name}' updated successfully.`, company };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Failed to update company.' };
  }
}

export async function deleteCompany(companyId: number) {
  await requireUser();

  try {
    await prisma.company.delete({
      where: { id: companyId }
    });

    revalidateCompanyData(companyId);

    return { success: true as const, message: 'Company deleted successfully.' };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Failed to delete company.' };
  }
}

export async function getCompany(companyId: number) {
  await requireUser();
  return prisma.company.findUnique({
    where: { id: companyId }
  });
}

export async function getCompanies() {
  await requireUser();
  return prisma.company.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      address: true,
      companyType: true,
      isActive: true
    }
  });
}

const getCompanyNamesCached = unstable_cache(
  async () =>
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
  ['company-name-options'],
  { tags: [CACHE_TAGS.companies], revalidate: 300 }
);

export async function getCompanyNames() {
  await requireUser();
  return getCompanyNamesCached();
}

export async function createOrUpdateCompany(formData: FormData) {
  await requireUser();
  const id = formData.get('id')?.toString();

  if (id && Number(id)) {
    return updateCompany(formData);
  }

  return createCompany(formData);
}

export async function getCompanyPageData(args: { page: number; search?: string; companyType?: string; status?: string }) {
  await requireUser();
  const take = 8;
  const skip = (Math.max(args.page, 1) - 1) * take;
  const filters: any[] = [];

  if (args.search) {
    filters.push({
      name: { contains: args.search, mode: 'insensitive' }
    });
  }

  if (args.companyType && args.companyType !== 'ALL') {
    filters.push({ companyType: args.companyType });
  }

  if (args.status && args.status !== 'ALL') {
    filters.push({ isActive: args.status === 'ACTIVE' });
  }

  const where = filters.length > 0 ? { AND: filters } : {};

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        contactPerson: true,
        phone: true,
        email: true,
        address: true,
        companyType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { transactions: true, products: true } }
      },
      orderBy: { name: 'asc' },
      skip,
      take
    }),
    prisma.company.count({ where })
  ]);

  const companyIds = companies.map((company) => company.id);
  const financials = companyIds.length === 0
    ? []
    : await prisma.$queryRaw<Array<{ companyId: number; totalPurchase: any; totalPaid: any }>>`
      SELECT
        c."id" AS "companyId",
        COALESCE(tp."totalPurchase", 0) AS "totalPurchase",
        COALESCE(pp."totalPaid", 0) AS "totalPaid"
      FROM "Company" c
      LEFT JOIN (
        SELECT "companyId", SUM("totalAmount") AS "totalPurchase"
        FROM "Transaction"
        WHERE "companyId" IN (${Prisma.join(companyIds)}) AND "transactionType" = 'PURCHASE'
        GROUP BY "companyId"
      ) tp ON tp."companyId" = c."id"
      LEFT JOIN (
        SELECT "companyId", SUM("amount") AS "totalPaid"
        FROM "Payment"
        WHERE "companyId" IN (${Prisma.join(companyIds)})
        GROUP BY "companyId"
      ) pp ON pp."companyId" = c."id"
      WHERE c."id" IN (${Prisma.join(companyIds)})
    `;

  const financialMap = new Map(
    (financials as Array<{ companyId: number; totalPurchase: any; totalPaid: any }>).map((f) => [
      f.companyId,
      {
        totalPurchase: Number(f.totalPurchase ?? 0),
        totalPaid: Number(f.totalPaid ?? 0),
        totalDue: Number(f.totalPurchase ?? 0) - Number(f.totalPaid ?? 0)
      }
    ])
  );

  const companiesWithFinancials = companies.map((company) => {
    const financial = financialMap.get(company.id) ?? { totalPurchase: 0, totalPaid: 0, totalDue: 0 };
    return {
      ...company,
      totalPurchase: financial.totalPurchase,
      totalPaid: financial.totalPaid,
      totalDue: financial.totalDue
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / take));

  return {
    companies: companiesWithFinancials,
    total,
    totalPages,
    page: Math.min(args.page, totalPages)
  };
}

export async function getCompanyStats(args: { search?: string; companyType?: string; status?: string } = {}) {
  await requireUser();
  const filters: any[] = [];

  if (args.search) {
    filters.push({
      name: { contains: args.search, mode: 'insensitive' }
    });
  }

  if (args.companyType && args.companyType !== 'ALL') {
    filters.push({ companyType: args.companyType });
  }

  if (args.status && args.status !== 'ALL') {
    filters.push({ isActive: args.status === 'ACTIVE' });
  }

  const where = filters.length > 0 ? { AND: filters } : {};

  const rows = await prisma.company.groupBy({
    by: ['isActive', 'companyType'],
    where,
    _count: { _all: true }
  });

  const total = rows.reduce((sum, row) => sum + row._count._all, 0);
  const active = rows.reduce((sum, row) => sum + (row.isActive ? row._count._all : 0), 0);
  const feed = rows.reduce((sum, row) => sum + (row.companyType === 'FEED' ? row._count._all : 0), 0);
  const medicine = rows.reduce((sum, row) => sum + (row.companyType === 'MEDICINE' ? row._count._all : 0), 0);
  const both = rows.reduce((sum, row) => sum + (row.companyType === 'BOTH' ? row._count._all : 0), 0);

  return { total, active, feed, medicine, both };
}

export async function getOrCreateCompany(name: string) {
  await requireUser();
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Company name is required.');
  }

  const existing = await prisma.company.findFirst({
    where: {
      name: {
        equals: trimmed,
        mode: 'insensitive'
      }
    },
    select: { id: true, name: true, companyType: true, isActive: true }
  });

  if (existing) {
    return existing;
  }

  const company = await prisma.company.create({
    data: {
      name: trimmed,
      companyType: 'FEED',
      isActive: true
    }
  });

  return company;
}

export async function getCompaniesByType(companyType: string) {
  await requireUser();
  return unstable_cache(
    async () => prisma.company.findMany({
    where: {
      isActive: true,
      companyType: { in: [companyType, 'BOTH'] }
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
    }),
    [`companies-by-type-${companyType}`],
    { tags: [CACHE_TAGS.companies], revalidate: 300 }
  )();
}

export async function getCompanyAccountSummary(companyId: number) {
  await requireUser();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { companyType: true }
  });

  if (!company) {
    notFound();
  }

  const [purchaseAgg, paymentAgg, lastTransaction, txnCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: { companyId, transactionType: 'PURCHASE' },
      _sum: { totalAmount: true }
    }),
    prisma.payment.aggregate({
      where: { companyId },
      _sum: { amount: true }
    }),
    prisma.transaction.findFirst({
      where: { companyId },
      orderBy: { transactionDate: 'desc' },
      select: { transactionDate: true }
    }),
    prisma.transaction.count({ where: { companyId } })
  ]);

  const totalFeedPurchases = Number(purchaseAgg._sum.totalAmount ?? 0);
  const totalMedicinePurchases = 0;
  const totalPayments = Number(paymentAgg._sum.amount ?? 0);
  const totalPurchase = totalFeedPurchases + totalMedicinePurchases;
  const totalDue = totalPurchase - totalPayments;

  return {
    companyType: company.companyType,
    totalFeedPurchases,
    totalMedicinePurchases,
    totalPayments,
    totalDue,
    totalTransactions: txnCount,
    lastTransactionDate: lastTransaction?.transactionDate ?? null
  };
}

export async function getCompanyProfile(companyId: number) {
  await requireUser();
  return prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      address: true,
      companyType: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          transactions: true,
          products: true
        }
      }
    }
  });
}

export async function getCompanyCurrentDue(companyId: number) {
  await requireUser();
  const [purchaseAgg, paymentAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { companyId, transactionType: 'PURCHASE' },
      _sum: { totalAmount: true }
    }),
    prisma.payment.aggregate({
      where: { companyId },
      _sum: { amount: true }
    })
  ]);

  const totalPurchase = Number(purchaseAgg._sum.totalAmount ?? 0);
  const totalPaid = Number(paymentAgg._sum.amount ?? 0);
  return totalPurchase - totalPaid;
}

const companyPaymentSchema = z.object({
  companyId: z.coerce.number().int().positive('Company is required.'),
  amount: z.coerce.number().min(0.01, 'Payment amount must be greater than zero.'),
  paymentDate: z.preprocess((value) => value || new Date(), z.coerce.date()),
  paymentMethod: z.string().min(1, 'Payment method is required.'),
  referenceNumber: z.string().optional().or(z.literal('')),
  notes: z.string().optional()
});

export async function recordPaymentForCompany(formData: FormData) {
  const session = await requireUser();
  const rawData = Object.fromEntries(formData.entries());
  const parsed = companyPaymentSchema.safeParse(rawData);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid payment data.' };
  }

  const { companyId, amount, paymentDate, paymentMethod, referenceNumber, notes } = parsed.data;

  const currentDue = await getCompanyCurrentDue(companyId);

  if (amount > currentDue) {
    return { success: false, message: `Payment amount cannot exceed current due of ৳${currentDue.toFixed(2)}.` };
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        companyId,
        paymentDate,
        paymentMethod,
        amount: new Prisma.Decimal(amount),
        referenceNumber: referenceNumber || null,
        status: 'COMPLETED',
        notes: notes || null,
        createdById: session.user.id
      }
    });

    const lastLedger = await prisma.ledgerEntry.findFirst({
      where: { companyId },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
    });
    const previousBalance = new Prisma.Decimal(lastLedger?.runningBalance ?? 0);
    const newBalance = previousBalance.minus(new Prisma.Decimal(amount));

    await prisma.ledgerEntry.create({
      data: {
        companyId,
        paymentId: payment.id,
        entryType: 'PAYMENT_PAID',
        amount: new Prisma.Decimal(-amount),
        runningBalance: newBalance,
        description: `Payment made to company`,
        referenceNumber: referenceNumber || undefined,
        createdById: session.user.id
      }
    });

    revalidateCompanyData(companyId);

    return { success: true, message: 'Payment recorded successfully.' };
  } catch (error) {
    console.error('Error recording company payment:', error);
    return { success: false, message: 'Failed to record payment.' };
  }
}
