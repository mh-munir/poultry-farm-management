'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma, PartyType } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { createMemoryParty, deleteMemoryParty, getMemoryPartyPageData, getMemoryPartyStats, updateMemoryParty } from './store';

const partySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2, 'Party name must be at least 2 characters long.'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  email: z.string().trim().email('Please enter a valid email address.').optional().or(z.literal('')),
  address: z.string().trim().max(250).optional().or(z.literal('')),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  taxNumber: z.string().trim().max(40).optional().or(z.literal('')),
  creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative.').default(0),
  openingBalance: z.coerce.number().min(-1000000000).max(1000000000).default(0),
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
    isActive: formData.get('isActive') === 'on'
  };
}

export async function createOrUpdateParty(formData: FormData) {
  const session = await requireUser();
  const parsed = partySchema.safeParse(normalizePartyInput(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    redirect(`/dashboard/parties?error=${encodeURIComponent(message)}`);
  }

  const data = parsed.data;
  const partyPayload = {
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    address: data.address?.trim() || null,
    partyType: data.partyType as PartyType,
    taxNumber: data.taxNumber?.trim() || null,
    creditLimit: data.creditLimit ? new Prisma.Decimal(data.creditLimit) : null,
    openingBalance: new Prisma.Decimal(data.openingBalance),
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
        creditLimit: partyPayload.creditLimit ? Number(partyPayload.creditLimit) : null,
        openingBalance: Number(partyPayload.openingBalance),
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
        creditLimit: partyPayload.creditLimit ? Number(partyPayload.creditLimit) : null,
        openingBalance: Number(partyPayload.openingBalance),
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

export async function deleteParty(formData: FormData) {
  await requireUser();
  const partyId = Number(formData.get('partyId'));

  if (!partyId) {
    redirect('/dashboard/parties?error=' + encodeURIComponent('A valid party id is required.'));
  }

  try {
    await prisma.party.delete({ where: { id: partyId } });
  } catch (error) {
    deleteMemoryParty(partyId);
    revalidatePath('/dashboard/parties');
    redirect('/dashboard/parties?success=' + encodeURIComponent('Party deleted locally.'));
  }

  revalidatePath('/dashboard/parties');
  redirect('/dashboard/parties?success=' + encodeURIComponent('Party deleted successfully.'));
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
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.party.count({ where })
    ]);

    return {
      parties: result as Array<{
        id: number;
        name: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        partyType: PartyType;
        taxNumber: string | null;
        creditLimit: Prisma.Decimal | null;
        openingBalance: Prisma.Decimal;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / take)),
      page: Math.min(page, Math.max(1, Math.ceil(totalCount / take)))
    };
  } catch (error) {
    return getMemoryPartyPageData({ page, search, partyType, status });
  }
}

export async function getPartyStats() {
  try {
    const [total, active, customers, suppliers] = await Promise.all([
      prisma.party.count(),
      prisma.party.count({ where: { isActive: true } }),
      prisma.party.count({ where: { partyType: 'CUSTOMER' } }),
      prisma.party.count({ where: { partyType: 'SUPPLIER' } })
    ]);

    return { total, active, customers, suppliers };
  } catch (error) {
    return getMemoryPartyStats();
  }
}
