'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma, PartyType } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { createMemoryParty, deleteMemoryParty, getFilteredMemoryParties, getMemoryParties, getMemoryPartyPageData, getMemoryPartyStats, updateMemoryParty } from './store';

const partySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2, 'Party name must be at least 2 characters long.'),
  phone: z.string().trim().regex(/^[0-9]{11}$/, 'Phone number must contain exactly 11 digits.'),
  email: z.string().trim().email('Please enter a valid email address.').optional().or(z.literal('')),
  address: z.string().trim().max(250).optional().or(z.literal('')),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  taxNumber: z.string().trim().max(40).optional().or(z.literal('')),
  creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative.').default(0),
  openingBalance: z.coerce.number().min(-1000000000).max(1000000000).default(0),
  feedQuantity: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  }, z.number().min(0).optional()),
  feedPrice: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  }, z.number().min(0).optional()),
  feedName: z.string().trim().max(100).optional().or(z.literal('')),
  medicineQuantity: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  }, z.number().min(0).optional()),
  medicinePrice: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  }, z.number().min(0).optional()),
  mediaName: z.string().trim().max(100).optional().or(z.literal('')),
  farmName: z.string().trim().max(100).optional().or(z.literal('')),
  isActive: z.boolean().default(true)
});

function normalizePartyInput(formData: FormData) {
  return {
    id: formData.get('id')?.toString() || undefined,
    name: formData.get('name')?.toString() ?? '',
    phone: formData.get('phone')?.toString() ?? '',
    email: formData.get('email')?.toString() ?? '',
    address: formData.get('address')?.toString() ?? '',
    partyType: formData.get('partyType')?.toString() ?? 'BOTH',
    taxNumber: formData.get('taxNumber')?.toString() ?? '',
    creditLimit: formData.get('creditLimit')?.toString() ?? '0',
    openingBalance: formData.get('openingBalance')?.toString() ?? '0',
    feedQuantity: formData.get('feedQuantity')?.toString() ?? '',
    feedPrice: formData.get('feedPrice')?.toString() ?? '',
    feedName: formData.get('feedName')?.toString() ?? '',
    medicineQuantity: formData.get('medicineQuantity')?.toString() ?? '',
    medicinePrice: formData.get('medicinePrice')?.toString() ?? '',
    mediaName: formData.get('mediaName')?.toString() ?? '',
    farmName: formData.get('farmName')?.toString() ?? '',
    isActive: formData.get('isActive') === 'on'
  };
}

async function isPhoneTaken(phone: string | null, excludeId?: number) {
  if (!phone) return false;

  const existingParty = await prisma.party.findUnique({
    where: { phone }
  });

  if (existingParty && existingParty.id !== excludeId) {
    return true;
  }

  return getMemoryParties().some((party) => party.phone?.trim() === phone && party.id !== excludeId);
}

export async function createOrUpdateParty(formData: FormData) {
  const session = await requireUser();
  const parsed = partySchema.safeParse(normalizePartyInput(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    redirect(`/dashboard/parties?error=${encodeURIComponent(message)}`);
  }

  const data = parsed.data;
  const normalizedPhone = data.phone?.trim() || null;

  if (await isPhoneTaken(normalizedPhone, data.id)) {
    redirect('/dashboard/parties?error=' + encodeURIComponent('This mobile number is already used by another party.'));
  }

  const partyPayload = {
    name: data.name.trim(),
    phone: normalizedPhone,
    email: data.email?.trim() || null,
    address: data.address?.trim() || null,
    partyType: data.partyType as PartyType,
    taxNumber: data.taxNumber?.trim() || null,
    creditLimit: data.creditLimit !== undefined ? new Prisma.Decimal(data.creditLimit) : null,
    openingBalance: new Prisma.Decimal(data.openingBalance),
    feedQuantity: data.feedQuantity != null ? new Prisma.Decimal(data.feedQuantity) : null,
    feedPrice: data.feedPrice != null ? new Prisma.Decimal(data.feedPrice) : null,
    feedName: data.feedName?.trim() || null,
    medicineQuantity: data.medicineQuantity != null ? new Prisma.Decimal(data.medicineQuantity) : null,
    medicinePrice: data.medicinePrice != null ? new Prisma.Decimal(data.medicinePrice) : null,
    mediaName: data.mediaName?.trim() || null,
    farmName: data.farmName?.trim() || null,
    isActive: data.isActive,
    createdById: session.user.id
  };

  try {
    if (data.id) {
      await prisma.party.update({
        where: { id: data.id },
        data: partyPayload
      });
    } else {
      await prisma.party.create({ data: partyPayload });
    }
  } catch (error) {
    if (data.id) {
      updateMemoryParty(data.id, {
        name: partyPayload.name,
        phone: partyPayload.phone,
        email: partyPayload.email,
        address: partyPayload.address,
        partyType: partyPayload.partyType,
        taxNumber: partyPayload.taxNumber,
        creditLimit: partyPayload.creditLimit != null ? Number(partyPayload.creditLimit) : null,
        openingBalance: Number(partyPayload.openingBalance),
        feedQuantity: partyPayload.feedQuantity != null ? Number(partyPayload.feedQuantity) : null,
        feedPrice: partyPayload.feedPrice != null ? Number(partyPayload.feedPrice) : null,
        feedName: partyPayload.feedName,
        medicineQuantity: partyPayload.medicineQuantity != null ? Number(partyPayload.medicineQuantity) : null,
        medicinePrice: partyPayload.medicinePrice != null ? Number(partyPayload.medicinePrice) : null,
        mediaName: partyPayload.mediaName,
        farmName: partyPayload.farmName,
        isActive: partyPayload.isActive,
        createdById: partyPayload.createdById ?? null
      });
    } else {
      createMemoryParty({
        name: partyPayload.name,
        phone: partyPayload.phone,
        email: partyPayload.email,
        address: partyPayload.address,
        partyType: partyPayload.partyType,
        taxNumber: partyPayload.taxNumber,
        creditLimit: partyPayload.creditLimit != null ? Number(partyPayload.creditLimit) : null,
        openingBalance: Number(partyPayload.openingBalance),
        feedQuantity: partyPayload.feedQuantity != null ? Number(partyPayload.feedQuantity) : null,
        feedPrice: partyPayload.feedPrice != null ? Number(partyPayload.feedPrice) : null,
        feedName: partyPayload.feedName,
        medicineQuantity: partyPayload.medicineQuantity != null ? Number(partyPayload.medicineQuantity) : null,
        medicinePrice: partyPayload.medicinePrice != null ? Number(partyPayload.medicinePrice) : null,
        mediaName: partyPayload.mediaName,
        farmName: partyPayload.farmName,
        isActive: partyPayload.isActive,
        createdById: partyPayload.createdById ?? null
      });
    }

    revalidatePath('/dashboard/parties');
    redirect('/dashboard/parties?success=' + encodeURIComponent(data.id ? 'Party updated locally.' : 'Party created locally.'));
  }

  revalidatePath('/dashboard/parties');
  redirect('/dashboard/parties?success=' + encodeURIComponent(data.id ? 'Party updated successfully.' : 'Party created successfully.'));
}

const salesEntrySchema = z.object({
  partyId: z.coerce.number().int().refine((value) => !Number.isNaN(value) && value !== 0, 'A valid party is required.'),
  feedName: z.string().trim().max(100).optional().or(z.literal('')),
  feedQuantity: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  }, z.number().min(0).optional()),
  feedPrice: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  }, z.number().min(0).optional()),
  medicineName: z.string().trim().max(100).optional().or(z.literal('')),
  medicineQuantity: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  }, z.number().min(0).optional()),
  medicinePrice: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  }, z.number().min(0).optional()),
  mediaName: z.string().trim().max(100).optional().or(z.literal(''))
});

function normalizeSalesEntryInput(formData: FormData) {
  return {
    partyId: formData.get('partyId')?.toString() || undefined,
    feedName: formData.get('feedName')?.toString() ?? '',
    feedQuantity: formData.get('feedQuantity')?.toString() ?? '',
    feedPrice: formData.get('feedPrice')?.toString() ?? '',
    medicineName: formData.get('medicineName')?.toString() ?? '',
    medicineQuantity: formData.get('medicineQuantity')?.toString() ?? '',
    medicinePrice: formData.get('medicinePrice')?.toString() ?? '',
    mediaName: formData.get('mediaName')?.toString() ?? ''
  };
}

export async function recordSaleForParty(formData: FormData) {
  await requireUser();
  const parsed = salesEntrySchema.safeParse(normalizeSalesEntryInput(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Sales entry validation failed.';
    redirect(`/dashboard/parties?error=${encodeURIComponent(message)}`);
  }

  const data = parsed.data;

  try {
    await prisma.party.update({
      where: { id: data.partyId },
      data: {
        feedName: data.feedName?.trim() || null,
        feedQuantity: data.feedQuantity != null ? new Prisma.Decimal(data.feedQuantity) : null,
        feedPrice: data.feedPrice != null ? new Prisma.Decimal(data.feedPrice) : null,
        medicineName: data.medicineName?.trim() || null,
        medicineQuantity: data.medicineQuantity != null ? new Prisma.Decimal(data.medicineQuantity) : null,
        medicinePrice: data.medicinePrice != null ? new Prisma.Decimal(data.medicinePrice) : null,
        mediaName: data.mediaName?.trim() || null
      }
    });
  } catch (error) {
    const updatedMemoryParty = updateMemoryParty(data.partyId, {
      feedName: data.feedName?.trim() || null,
      feedQuantity: data.feedQuantity != null ? Number(data.feedQuantity) : null,
      feedPrice: data.feedPrice != null ? Number(data.feedPrice) : null,
      medicineName: data.medicineName?.trim() || null,
      medicineQuantity: data.medicineQuantity != null ? Number(data.medicineQuantity) : null,
      medicinePrice: data.medicinePrice != null ? Number(data.medicinePrice) : null,
      mediaName: data.mediaName?.trim() || null
    });

    if (updatedMemoryParty) {
      revalidatePath('/dashboard/parties');
      redirect('/dashboard/parties?success=' + encodeURIComponent('Sales entry saved locally.'));
    }

    redirect('/dashboard/parties?error=' + encodeURIComponent('Failed to save sales entry.'));
  }

  revalidatePath('/dashboard/parties');
  redirect('/dashboard/parties?success=' + encodeURIComponent('Sales entry saved successfully.'));
}

export async function deleteParty(formData: FormData) {
  await requireUser();
  const partyId = Number(formData.get('partyId'));

  if (!partyId) {
    redirect('/dashboard/parties?error=' + encodeURIComponent('A valid party id is required.'));
  }

  try {
    const partyTransactions = await prisma.transaction.findMany({
      where: { partyId },
      select: { id: true }
    });
    const transactionIds = partyTransactions.map((transaction) => transaction.id);

    const partyPayments = await prisma.payment.findMany({
      where: { partyId },
      select: { id: true }
    });
    const paymentIds = partyPayments.map((payment) => payment.id);

    await prisma.$transaction([
      prisma.ledgerEntry.deleteMany({
        where: {
          OR: [
            { partyId },
            { transactionId: { in: transactionIds } },
            { paymentId: { in: paymentIds } }
          ]
        }
      }),
      prisma.paymentAllocation.deleteMany({ where: { paymentId: { in: paymentIds } } }),
      prisma.stockMovement.deleteMany({ where: { transactionId: { in: transactionIds } } }),
      prisma.dueAdjustment.deleteMany({ where: { partyId } }),
      prisma.payment.deleteMany({ where: { partyId } }),
      prisma.transaction.deleteMany({ where: { partyId } }),
      prisma.party.delete({ where: { id: partyId } })
    ]);

    deleteMemoryParty(partyId);
  } catch (error) {
    deleteMemoryParty(partyId);
    revalidatePath('/dashboard/parties');
    redirect('/dashboard/parties?success=' + encodeURIComponent('Party deleted locally.'));
  }

  revalidatePath('/dashboard/parties');
  redirect('/dashboard/parties?success=' + encodeURIComponent('Party deleted successfully.'));
}

function buildPartyWhere({
  search,
  partyType,
  status
}: {
  search?: string;
  partyType?: string;
  status?: string;
}): Prisma.PartyWhereInput {
  const where: Prisma.PartyWhereInput = {};

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { taxNumber: { contains: term, mode: 'insensitive' } }
    ];
  }

  if (partyType && partyType !== 'ALL') {
    where.partyType = partyType as PartyType;
  }

  if (status && status !== 'ALL') {
    where.isActive = status === 'ACTIVE';
  }

  return where;
}

export async function getPartyPageData({
  page,
  search,
  partyType,
  status
}: {
  page: number;
  search?: string;
  partyType?: string;
  status?: string;
}) {
  const take = 8;
  const skip = (Math.max(page, 1) - 1) * take;
  const where = buildPartyWhere({ search, partyType, status });

  try {
    const [result, totalCount] = await Promise.all([
      prisma.party.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          partyType: true,
          taxNumber: true,
          creditLimit: true,
          openingBalance: true,
          feedQuantity: true,
          feedPrice: true,
          feedName: true,
          medicineQuantity: true,
          medicinePrice: true,
          mediaName: true,
          farmName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.party.count({ where })
    ]);

    const memoryParties = getFilteredMemoryParties({ search, partyType, status }).filter((party) => party.id < 0);
    const mergedParties = memoryParties.length > 0
      ? [...result, ...memoryParties].sort((a, b) => {
          if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
          }

          return b.createdAt.getTime() - a.createdAt.getTime();
        })
      : result;

    const totalCountWithMemory = totalCount + memoryParties.length;
    const totalPagesWithMemory = Math.max(1, Math.ceil(totalCountWithMemory / take));

    return {
      parties: mergedParties.slice(skip, skip + take) as Array<{
        id: number;
        name: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        partyType: PartyType;
        taxNumber: string | null;
        creditLimit: Prisma.Decimal | null;
        openingBalance: Prisma.Decimal;
        feedQuantity: Prisma.Decimal | null;
        feedPrice: Prisma.Decimal | null;
        feedName: string | null;
        medicineQuantity: Prisma.Decimal | null;
        medicinePrice: Prisma.Decimal | null;
        mediaName: string | null;
        farmName: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>,
      total: totalCountWithMemory,
      totalPages: totalPagesWithMemory,
      page: Math.min(page, totalPagesWithMemory)
    };
  } catch (error) {
    return getMemoryPartyPageData({ page, search, partyType, status });
  }
}

export async function getPartyNames() {
  try {
    const parties = await prisma.party.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    const memoryParties = getMemoryParties()
      .filter((party) => party.isActive)
      .map((party) => ({ id: party.id, name: party.name }));
    const mergedParties = [...parties.map((party) => ({ id: party.id, name: party.name })), ...memoryParties];
    const uniqueParties = Array.from(new Map(mergedParties.map((party) => [party.id, party])).values());

    return uniqueParties.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    return getMemoryParties()
      .filter((party) => party.isActive)
      .map((party) => ({ id: party.id, name: party.name }));
  }
}

export async function getPartyStats({
  search,
  partyType,
  status
}: {
  search?: string;
  partyType?: string;
  status?: string;
} = {}) {
  try {
    const where = buildPartyWhere({ search, partyType, status });

    const [total, active, customers, suppliers] = await Promise.all([
      prisma.party.count({ where }),
      prisma.party.count({ where: { ...where, isActive: true } }),
      prisma.party.count({ where: { ...where, partyType: 'CUSTOMER' } }),
      prisma.party.count({ where: { ...where, partyType: 'SUPPLIER' } })
    ]);

    const memoryStats = getMemoryPartyStats({ search, partyType, status });
    const localOnlyMemoryStats = getFilteredMemoryParties({ search, partyType, status }).filter((party) => party.id < 0);
    const localOnlyStats = {
      total: localOnlyMemoryStats.length,
      active: localOnlyMemoryStats.filter((party) => party.isActive).length,
      customers: localOnlyMemoryStats.filter((party) => party.partyType === 'CUSTOMER').length,
      suppliers: localOnlyMemoryStats.filter((party) => party.partyType === 'SUPPLIER').length
    };

    return {
      total: total + localOnlyStats.total,
      active: active + localOnlyStats.active,
      customers: customers + localOnlyStats.customers,
      suppliers: suppliers + localOnlyStats.suppliers
    };
  } catch (error) {
    return getMemoryPartyStats({ search, partyType, status });
  }
}
