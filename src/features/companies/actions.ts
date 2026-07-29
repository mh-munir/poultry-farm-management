'use server';

import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';
import { requireUser } from '@/lib/auth';

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
  await requireUser();
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
          connect: { id: (await requireUser()).user.id ?? '' }
        }
      }
    });

    revalidatePath('/dashboard/companies');
    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard/purchases');

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

    revalidatePath('/dashboard/companies');
    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard/purchases');

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

    revalidatePath('/dashboard/companies');
    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard/purchases');

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

export async function getCompanyNames() {
  await requireUser();
  return prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
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
      OR: [
        { name: { contains: args.search, mode: 'insensitive' } },
        { contactPerson: { contains: args.search, mode: 'insensitive' } }
      ]
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

  const companiesWithFinancials = await Promise.all(
    companies.map(async (company) => {
      const [purchaseAgg, paymentAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { companyId: company.id, transactionType: 'PURCHASE' },
          _sum: { totalAmount: true }
        }),
        prisma.payment.aggregate({
          where: { companyId: company.id },
          _sum: { amount: true }
        })
      ]);

      const totalPurchase = Number(purchaseAgg._sum.totalAmount ?? 0);
      const totalPaid = Number(paymentAgg._sum.amount ?? 0);
      const totalDue = totalPurchase - totalPaid;

      return {
        ...company,
        totalPurchase,
        totalPaid,
        totalDue
      };
    })
  );

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
      OR: [
        { name: { contains: args.search, mode: 'insensitive' } },
        { contactPerson: { contains: args.search, mode: 'insensitive' } }
      ]
    });
  }

  if (args.companyType && args.companyType !== 'ALL') {
    filters.push({ companyType: args.companyType });
  }

  if (args.status && args.status !== 'ALL') {
    filters.push({ isActive: args.status === 'ACTIVE' });
  }

  const where = filters.length > 0 ? { AND: filters } : {};

  const total = await prisma.company.count({ where });
  const active = await prisma.company.count({ where: { ...where, isActive: true } });
  const feed = await prisma.company.count({ where: { ...where, companyType: 'FEED' } });
  const medicine = await prisma.company.count({ where: { ...where, companyType: 'MEDICINE' } });
  const both = await prisma.company.count({ where: { ...where, companyType: 'BOTH' } });

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
  return prisma.company.findMany({
    where: {
      isActive: true,
      companyType: { in: [companyType, 'BOTH'] }
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
}

export async function getCompanyAccountSummary(companyId: number) {
  await requireUser();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      companyType: true,
      transactions: {
        select: {
          transactionType: true,
          totalAmount: true,
          paidAmount: true,
          dueAmount: true,
          transactionDate: true,
          transactionItems: {
            select: {
              product: {
                select: {
                  name: true,
                  unit: true,
                  productType: true
                }
              }
            }
          }
        }
      },
      payments: {
        select: {
          amount: true,
          paymentDate: true,
          paymentMethod: true,
          referenceNumber: true,
          status: true,
          notes: true
        }
      }
    }
  });

  if (!company) {
    notFound();
  }

  const feedPurchases = company.transactions.filter((t) => t.transactionType === 'PURCHASE');
  const medicinePurchases = company.transactions.filter((t) => t.transactionType === 'PURCHASE');

  const totalFeedPurchases = feedPurchases.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const totalMedicinePurchases = medicinePurchases.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const totalPayments = company.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPurchase = totalFeedPurchases + totalMedicinePurchases;
  const totalDue = totalPurchase - totalPayments;
  const totalTransactions = company.transactions.length;

  const lastTransactionDate = company.transactions.length > 0
    ? new Date(Math.max(...company.transactions.map((t) => new Date(t.transactionDate).getTime())))
    : null;

  return {
    companyType: company.companyType,
    totalFeedPurchases,
    totalMedicinePurchases,
    totalPayments,
    totalDue,
    totalTransactions,
    lastTransactionDate,
    transactions: company.transactions,
    payments: company.payments
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
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      transactions: {
        where: { transactionType: 'PURCHASE' },
        select: { totalAmount: true }
      },
      payments: {
        select: { amount: true }
      }
    }
  });

  if (!company) {
    return 0;
  }

  const totalPurchase = company.transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const totalPaid = company.payments.reduce((sum, p) => sum + Number(p.amount), 0);
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

    revalidatePath('/dashboard/companies');
    revalidatePath(`/dashboard/companies/${companyId}`);

    return { success: true, message: 'Payment recorded successfully.' };
  } catch (error) {
    console.error('Error recording company payment:', error);
    return { success: false, message: 'Failed to record payment.' };
  }
}
