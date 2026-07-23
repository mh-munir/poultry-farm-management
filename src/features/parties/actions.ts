'use server';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';

async function setFlashSuccess(message: string) {
  const cookiesStore = await cookies();
  cookiesStore.set({
    name: 'partySuccess',
    value: message,
    path: '/dashboard/parties',
    sameSite: 'lax'
  });
}

import { createMemoryParty, deleteMemoryParty, getFilteredMemoryParties, getMemoryParties, getMemoryPartyPageData, getMemoryPartyStats, updateMemoryParty } from './store';

type PartyTypeValue = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';

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

async function savePartyImage(formData: FormData, existingImageUrl?: string | null) {
  const imageFile = formData.get('image');

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return existingImageUrl ?? null;
  }

  if (!imageFile.type.startsWith('image/')) {
    throw new Error('Please upload a valid image file.');
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'party-images');
  await mkdir(uploadDir, { recursive: true });

  const originalExt = path.extname(imageFile.name) || '.png';
  const originalBuffer = Buffer.from(await imageFile.arrayBuffer());

  let finalBuffer = originalBuffer;
  let finalExt = originalExt;

  try {
    const sharpModule = (await import('sharp')).default ?? (await import('sharp'));
    const compressedBuffer = await sharpModule(originalBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    finalBuffer = Buffer.from(compressedBuffer);
    finalExt = '.webp';
  } catch (err) {
    // sharp not available or failed — fall back to original buffer
  }

  const fileName = `${randomUUID()}${finalExt}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, finalBuffer);

  return `/uploads/party-images/${fileName}`;
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
    const url = new URL('/dashboard/parties', 'http://localhost');
    url.searchParams.set('error', message);
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  const data = parsed.data;
  const normalizedPhone = data.phone.trim();
  const existingImageUrl = formData.get('existingImageUrl')?.toString() || null;

  if (await isPhoneTaken(normalizedPhone, data.id)) {
    const url = new URL('/dashboard/parties', 'http://localhost');
    url.searchParams.set('error', 'This mobile number is already used by another party.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  let imageUrl: string | null = null;

  try {
    imageUrl = await savePartyImage(formData, existingImageUrl);
  } catch (error) {
    const url = new URL('/dashboard/parties', 'http://localhost');
    url.searchParams.set('error', error instanceof Error ? error.message : 'Failed to upload party image.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  const partyPayload = {
    name: data.name.trim(),
    phone: normalizedPhone,
    email: data.email?.trim() || null,
    address: data.address?.trim() || null,
    partyType: data.partyType as PartyTypeValue,
    taxNumber: data.taxNumber?.trim() || null,
    creditLimit: data.creditLimit !== undefined ? new Prisma.Decimal(data.creditLimit) : null,
    openingBalance: new Prisma.Decimal(data.openingBalance),
    imageUrl,
    isActive: data.isActive
  };

  const createPartyPayload = {
    ...partyPayload,
    createdById: session.user.id ?? null
  };

  const updatePartyPayload: Prisma.PartyUpdateInput = {
    name: partyPayload.name,
    phone: partyPayload.phone,
    email: partyPayload.email,
    address: partyPayload.address,
    partyType: partyPayload.partyType,
    taxNumber: partyPayload.taxNumber,
    creditLimit: partyPayload.creditLimit,
    openingBalance: partyPayload.openingBalance,
    imageUrl: partyPayload.imageUrl,
    isActive: partyPayload.isActive
  };

  try {
    if (data.id) {
      await prisma.party.update({
        where: { id: data.id },
        data: updatePartyPayload
      });
    } else {
      await prisma.party.create({ data: createPartyPayload });
    }
  } catch (error) {
    try {
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
          imageUrl: partyPayload.imageUrl,
          isActive: partyPayload.isActive
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
          feedQuantity: null,
          feedPrice: null,
          feedName: null,
          medicineName: null,
          medicineQuantity: null,
          medicinePrice: null,
          imageUrl: partyPayload.imageUrl,
          mediaName: null,
          farmName: null,
          isActive: partyPayload.isActive,
          createdById: createPartyPayload.createdById ?? null
        });
      }

      revalidatePath('/dashboard/parties');
      await setFlashSuccess(data.id ? 'Party updated locally.' : 'Party created locally.');
      redirect('/dashboard/parties');
    } catch (memoryError) {
      const url = new URL('/dashboard/parties', 'http://localhost');
      url.searchParams.set('error', 'Failed to save party. Please try again.');
      // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
      redirect(url.toString());
    }
  }

  revalidatePath('/dashboard/parties');
  await setFlashSuccess(data.id ? 'Party updated successfully.' : 'Party created successfully.');
  redirect('/dashboard/parties');
}

export async function createOrUpdatePartyWithToast(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireUser();
    const parsed = partySchema.safeParse(normalizePartyInput(formData));

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
      return { success: false, message };
    }

    const data = parsed.data;
    const normalizedPhone = data.phone.trim();
    const existingImageUrl = formData.get('existingImageUrl')?.toString() || null;

    if (await isPhoneTaken(normalizedPhone, data.id)) {
      return { success: false, message: 'This mobile number is already used by another party.' };
    }

    let imageUrl: string | null = null;

    try {
      imageUrl = await savePartyImage(formData, existingImageUrl);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload party image.'
      };
    }

    const partyPayload = {
      name: data.name.trim(),
      phone: normalizedPhone,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      partyType: data.partyType as PartyTypeValue,
      taxNumber: data.taxNumber?.trim() || null,
      creditLimit: data.creditLimit !== undefined ? new Prisma.Decimal(data.creditLimit) : null,
      openingBalance: new Prisma.Decimal(data.openingBalance),
      imageUrl,
      isActive: data.isActive
    };

    const createPartyPayload = {
      ...partyPayload,
      createdById: session.user.id ?? null
    };

    const updatePartyPayload: Prisma.PartyUpdateInput = {
      name: partyPayload.name,
      phone: partyPayload.phone,
      email: partyPayload.email,
      address: partyPayload.address,
      partyType: partyPayload.partyType,
      taxNumber: partyPayload.taxNumber,
      creditLimit: partyPayload.creditLimit,
      openingBalance: partyPayload.openingBalance,
      imageUrl: partyPayload.imageUrl,
      isActive: partyPayload.isActive
    };

    try {
      if (data.id) {
        await prisma.party.update({
          where: { id: data.id },
          data: updatePartyPayload
        });
        return { success: true, message: 'Party updated successfully!' };
      } else {
        await prisma.party.create({ data: createPartyPayload });
        return { success: true, message: 'Party created successfully!' };
      }
    } catch (dbError) {
      // Fallback to memory storage
      try {
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
            imageUrl: partyPayload.imageUrl,
            isActive: partyPayload.isActive
          });
          return { success: true, message: 'Party updated locally.' };
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
            feedQuantity: null,
            feedPrice: null,
            feedName: null,
            medicineName: null,
            medicineQuantity: null,
            medicinePrice: null,
            imageUrl: partyPayload.imageUrl,
            mediaName: null,
            farmName: null,
            isActive: partyPayload.isActive,
            createdById: createPartyPayload.createdById ?? null
          });
          return { success: true, message: 'Party created locally.' };
        }
      } catch (memoryError) {
        return { success: false, message: 'Failed to save party. Please try again.' };
      }
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'An error occurred.' };
  }
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
    const partyId = Number(formData.get('partyId') ?? 0);
    const message = parsed.error.issues[0]?.message ?? 'Sales entry validation failed.';
    const url = new URL('/dashboard/parties', 'http://localhost');
    url.searchParams.set('error', message);
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  const data = parsed.data;

  try {
    const salesUpdatePayload: Prisma.PartyUpdateInput = {
      feedName: data.feedName?.trim() || null,
      feedQuantity: data.feedQuantity != null ? new Prisma.Decimal(data.feedQuantity) : null,
      feedPrice: data.feedPrice != null ? new Prisma.Decimal(data.feedPrice) : null,
      medicineName: data.medicineName?.trim() || null,
      medicineQuantity: data.medicineQuantity != null ? new Prisma.Decimal(data.medicineQuantity) : null,
      medicinePrice: data.medicinePrice != null ? new Prisma.Decimal(data.medicinePrice) : null,
      mediaName: data.mediaName?.trim() || null
    };

    await prisma.party.update({
      where: { id: data.partyId },
      data: salesUpdatePayload
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
      const url = new URL('/dashboard/parties', 'http://localhost');
      url.searchParams.set('success', 'Sales entry saved locally.');
      // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for success messages
      redirect(url.toString());
    }

    const url = new URL('/dashboard/parties', 'http://localhost');
    url.searchParams.set('error', 'Failed to save sales entry.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  revalidatePath('/dashboard/parties');
  const url = new URL('/dashboard/parties', 'http://localhost');
  url.searchParams.set('success', 'Sales entry saved successfully.');
  // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for success messages
  redirect(url.toString());
}

export async function recordSaleForPartyWithToast(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    await requireUser();
    const parsed = salesEntrySchema.safeParse(normalizeSalesEntryInput(formData));

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Sales entry validation failed.';
      return { success: false, message };
    }

    const data = parsed.data;

    try {
      const salesUpdatePayload: Prisma.PartyUpdateInput = {
        feedName: data.feedName?.trim() || null,
        feedQuantity: data.feedQuantity != null ? new Prisma.Decimal(data.feedQuantity) : null,
        feedPrice: data.feedPrice != null ? new Prisma.Decimal(data.feedPrice) : null,
        medicineName: data.medicineName?.trim() || null,
        medicineQuantity: data.medicineQuantity != null ? new Prisma.Decimal(data.medicineQuantity) : null,
        medicinePrice: data.medicinePrice != null ? new Prisma.Decimal(data.medicinePrice) : null,
        mediaName: data.mediaName?.trim() || null
      };

      await prisma.party.update({
        where: { id: data.partyId },
        data: salesUpdatePayload
      });

      return { success: true, message: 'Sales entry saved successfully!' };
    } catch (dbError) {
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
        return { success: true, message: 'Sales entry saved locally.' };
      }

      return { success: false, message: 'Failed to save sales entry.' };
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'An error occurred.' };
  }
}

const paymentEntrySchema = z.object({
  partyId: z.coerce.number().int().positive('Party is required.'),
  amount: z.coerce.number().min(0.01, 'Payment amount must be greater than zero.'),
  paymentMethod: z.string().trim().min(1, 'Payment method is required.'),
  referenceNumber: z.string().trim().max(50).optional().or(z.literal('')),
  status: z.string().trim().min(1).default('COMPLETED'),
  notes: z.string().trim().max(250).optional().or(z.literal(''))
});

function normalizePaymentInput(formData: FormData) {
  return {
    partyId: formData.get('partyId')?.toString() ?? '',
    amount: formData.get('amount')?.toString() ?? '',
    paymentMethod: formData.get('paymentMethod')?.toString() ?? '',
    referenceNumber: formData.get('referenceNumber')?.toString() ?? '',
    status: formData.get('status')?.toString() ?? 'COMPLETED',
    notes: formData.get('notes')?.toString() ?? ''
  };
}

export async function recordPaymentForParty(formData: FormData) {
  const session = await requireUser();
  const parsed = paymentEntrySchema.safeParse(normalizePaymentInput(formData));

  if (!parsed.success) {
    const partyId = Number(formData.get('partyId') ?? 0);
    const message = parsed.error.issues[0]?.message ?? 'Payment validation failed.';
    const url = new URL(`/dashboard/parties/${partyId}`, 'http://localhost');
    url.searchParams.set('error', message);
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  const data = parsed.data;

  await prisma.payment.create({
    data: {
      partyId: data.partyId,
      paymentDate: new Date(),
      paymentMethod: data.paymentMethod.trim(),
      amount: new Prisma.Decimal(data.amount),
      referenceNumber: data.referenceNumber?.trim() || null,
      status: data.status.trim() || 'COMPLETED',
      notes: data.notes?.trim() || null,
      createdById: session.user.id
    }
  });

  revalidatePath('/dashboard/parties');
  revalidatePath(`/dashboard/parties/${data.partyId}`);
  const url = new URL(`/dashboard/parties/${data.partyId}`, 'http://localhost');
  url.searchParams.set('success', 'Payment recorded successfully.');
  // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for success messages
  redirect(url.toString());
}

export async function updatePaymentForParty(formData: FormData) {
  await requireUser();
  const paymentId = Number(formData.get('paymentId'));
  const partyId = Number(formData.get('partyId'));

  if (!paymentId || !partyId) {
    const url = new URL(`/dashboard/parties/${partyId || 0}`, 'http://localhost');
    url.searchParams.set('error', 'A valid payment is required.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  const amount = Number(formData.get('amount'));
  const paymentMethod = formData.get('paymentMethod')?.toString().trim();
  const referenceNumber = formData.get('referenceNumber')?.toString().trim() || null;
  const status = formData.get('status')?.toString().trim() || 'COMPLETED';
  const notes = formData.get('notes')?.toString().trim() || null;

  if (!paymentMethod || Number.isNaN(amount) || amount <= 0) {
    const url = new URL(`/dashboard/parties/${partyId}`, 'http://localhost');
    url.searchParams.set('error', 'Payment update is invalid.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      amount: new Prisma.Decimal(amount),
      paymentMethod,
      referenceNumber,
      status,
      notes
    }
  });

  revalidatePath('/dashboard/parties');
  revalidatePath(`/dashboard/parties/${partyId}`);
  const url = new URL(`/dashboard/parties/${partyId}`, 'http://localhost');
  url.searchParams.set('success', 'Payment updated successfully.');
  // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for success messages
  redirect(url.toString());
}

export async function deletePaymentForParty(formData: FormData) {
  await requireUser();
  const paymentId = Number(formData.get('paymentId'));
  const partyId = Number(formData.get('partyId'));

  if (!paymentId || !partyId) {
    const url = new URL(`/dashboard/parties/${partyId || 0}`, 'http://localhost');
    url.searchParams.set('error', 'A valid payment is required.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  await prisma.payment.delete({ where: { id: paymentId } });

  revalidatePath('/dashboard/parties');
  revalidatePath(`/dashboard/parties/${partyId}`);
  const url = new URL(`/dashboard/parties/${partyId}`, 'http://localhost');
  url.searchParams.set('success', 'Payment deleted successfully.');
  // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for success messages
  redirect(url.toString());
}

export async function deleteParty(formData: FormData) {
  await requireUser();
  const partyId = Number(formData.get('partyId'));

  if (!partyId) {
    const url = new URL('/dashboard/parties', 'http://localhost');
    url.searchParams.set('error', 'A valid party id is required.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  try {
    await prisma.$transaction([
      prisma.ledgerEntry.deleteMany({
        where: {
          OR: [
            { partyId },
            { transaction: { partyId } },
            { payment: { partyId } }
          ]
        }
      }),
      prisma.paymentAllocation.deleteMany({
        where: {
          OR: [
            { payment: { partyId } },
            { transaction: { partyId } }
          ]
        }
      }),
      prisma.stockMovement.deleteMany({
        where: {
          transaction: { partyId }
        }
      }),
      prisma.dueAdjustment.deleteMany({ where: { partyId } }),
      prisma.payment.deleteMany({ where: { partyId } }),
      prisma.transaction.deleteMany({ where: { partyId } }),
      prisma.party.delete({ where: { id: partyId } })
    ]);

    deleteMemoryParty(partyId);
  } catch (error) {
    deleteMemoryParty(partyId);
    revalidatePath('/dashboard/parties');
    await setFlashSuccess('Party deleted locally.');
    redirect('/dashboard/parties');
  }

  revalidatePath('/dashboard/parties');
  await setFlashSuccess('Party deleted successfully.');
  redirect('/dashboard/parties');
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
      { name: { contains: term } },
      { phone: { contains: term } },
      { email: { contains: term } },
      { taxNumber: { contains: term } }
    ];
  }

  if (partyType && partyType !== 'ALL') {
    where.partyType = partyType as PartyTypeValue;
  }

  if (status && status !== 'ALL') {
    where.isActive = status === 'ACTIVE';
  }

  return where;
}

type PartyPageParty = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  partyType: PartyTypeValue;
  taxNumber: string | null;
  creditLimit: Prisma.Decimal | null;
  openingBalance: Prisma.Decimal;
  feedQuantity: Prisma.Decimal | null;
  feedPrice: Prisma.Decimal | null;
  feedName: string | null;
  medicineQuantity: Prisma.Decimal | null;
  medicinePrice: Prisma.Decimal | null;
  imageUrl: string | null;
  mediaName: string | null;
  farmName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalInvoiced?: number;
  totalPaid?: number;
  totalDue?: number;
};

type PartyAccountSummary = {
  customerInvoiced: number;
  customerPaid: number;
  customerDue: number;
  supplierInvoiced: number;
  supplierPaid: number;
  supplierDue: number;
  offsetApplied: number;
  netCustomerDue: number;
  netSupplierDue: number;
  totalInvoiced: number;
  totalPaid: number;
  totalDue: number;
};

function createEmptyAccountSummary(): PartyAccountSummary {
  return {
    customerInvoiced: 0,
    customerPaid: 0,
    customerDue: 0,
    supplierInvoiced: 0,
    supplierPaid: 0,
    supplierDue: 0,
    offsetApplied: 0,
    netCustomerDue: 0,
    netSupplierDue: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    totalDue: 0
  };
}

function finalizeAccountSummary(summary: PartyAccountSummary) {
  summary.customerDue = Math.max(summary.customerInvoiced - summary.customerPaid, 0);
  summary.supplierDue = Math.max(summary.supplierInvoiced - summary.supplierPaid, 0);
  summary.offsetApplied = Math.min(summary.customerDue, summary.supplierDue);
  summary.netCustomerDue = Math.max(summary.customerDue - summary.supplierDue, 0);
  summary.netSupplierDue = Math.max(summary.supplierDue - summary.customerDue, 0);
  summary.totalInvoiced = summary.customerInvoiced;
  summary.totalPaid = summary.customerPaid + summary.offsetApplied;
  summary.totalDue = summary.netCustomerDue;

  return summary;
}

function getVisiblePartyDue(partyType: PartyTypeValue, summary: PartyAccountSummary) {
  if (partyType === 'SUPPLIER') {
    return summary.supplierDue;
  }

  return summary.netCustomerDue;
}

function getVisiblePartyPaid(partyType: PartyTypeValue, summary: PartyAccountSummary) {
  if (partyType === 'SUPPLIER') {
    return summary.supplierPaid;
  }

  return summary.customerPaid + summary.offsetApplied;
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
  const take = 5;
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
          imageUrl: true,
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

    const partyIds = mergedParties.map((party) => party.id);
    const accountSummaries = await getPartyAccountSummaries(partyIds);
    const partiesWithSummaries = mergedParties.map((party) => {
      const summary = accountSummaries.get(party.id) ?? createEmptyAccountSummary();
      const visiblePartyType = party.partyType as PartyTypeValue;
      return {
        ...party,
        totalInvoiced: summary.totalInvoiced,
        totalPaid: getVisiblePartyPaid(visiblePartyType, summary),
        totalDue: getVisiblePartyDue(visiblePartyType, summary)
      };
    });

    const totalCountWithMemory = totalCount + memoryParties.length;
    const totalPagesWithMemory = Math.max(1, Math.ceil(totalCountWithMemory / take));

    return {
      parties: partiesWithSummaries.slice(skip, skip + take) as PartyPageParty[],
      total: totalCountWithMemory,
      totalPages: totalPagesWithMemory,
      page: Math.min(page, totalPagesWithMemory)
    };
  } catch (error) {
    return getMemoryPartyPageData({ page, search, partyType, status });
  }
}

export async function getPartyAccountSummary(partyId: number) {
  const [party, transactions, payments] = await Promise.all([
    prisma.party.findUnique({
      where: { id: partyId },
      select: { partyType: true }
    }),
    prisma.transaction.findMany({
      where: { partyId },
      select: { transactionType: true, totalAmount: true }
    }),
    prisma.payment.findMany({
      where: { partyId },
      select: {
        amount: true,
        allocations: {
          select: {
            amount: true,
            transaction: { select: { transactionType: true } }
          }
        }
      }
    })
  ]);

  const partyType = (party?.partyType ?? 'BOTH') as PartyTypeValue;
  const summary = createEmptyAccountSummary();

  for (const transaction of transactions) {
    const amount = Number(transaction.totalAmount ?? 0);

    if (transaction.transactionType === 'PURCHASE') {
      summary.supplierInvoiced += amount;
    } else {
      summary.customerInvoiced += amount;
    }
  }

  for (const payment of payments) {
    let allocatedAmount = 0;

    for (const allocation of payment.allocations) {
      const amount = Number(allocation.amount ?? 0);
      allocatedAmount += amount;

      if (allocation.transaction.transactionType === 'PURCHASE') {
        summary.supplierPaid += amount;
      } else {
        summary.customerPaid += amount;
      }
    }

    const unallocatedAmount = Math.max(Number(payment.amount ?? 0) - allocatedAmount, 0);
    if (partyType === 'SUPPLIER') {
      summary.supplierPaid += unallocatedAmount;
    } else {
      summary.customerPaid += unallocatedAmount;
    }
  }

  return finalizeAccountSummary(summary);
}

export async function getPartyAccountSummaries(partyIds: number[]) {
  if (partyIds.length === 0) {
    return new Map<number, PartyAccountSummary>();
  }

  const [parties, transactions, payments] = await Promise.all([
    prisma.party.findMany({
      where: { id: { in: partyIds } },
      select: { id: true, partyType: true }
    }),
    prisma.transaction.findMany({
      where: { partyId: { in: partyIds } },
      select: { partyId: true, transactionType: true, totalAmount: true }
    }),
    prisma.payment.findMany({
      where: { partyId: { in: partyIds } },
      select: {
        partyId: true,
        amount: true,
        allocations: {
          select: {
            amount: true,
            transaction: { select: { transactionType: true } }
          }
        }
      }
    })
  ]);

  const summaries = new Map<number, PartyAccountSummary>();
  const partyTypes = new Map(parties.map((party) => [party.id, party.partyType as PartyTypeValue]));

  for (const partyId of partyIds) {
    summaries.set(partyId, createEmptyAccountSummary());
  }

  for (const transaction of transactions) {
    const partySummary = summaries.get(transaction.partyId) ?? createEmptyAccountSummary();
    const amount = Number(transaction.totalAmount ?? 0);

    if (transaction.transactionType === 'PURCHASE') {
      partySummary.supplierInvoiced += amount;
    } else {
      partySummary.customerInvoiced += amount;
    }

    summaries.set(transaction.partyId, partySummary);
  }

  for (const payment of payments) {
    const partySummary = summaries.get(payment.partyId) ?? createEmptyAccountSummary();
    let allocatedAmount = 0;

    for (const allocation of payment.allocations) {
      const amount = Number(allocation.amount ?? 0);
      allocatedAmount += amount;

      if (allocation.transaction.transactionType === 'PURCHASE') {
        partySummary.supplierPaid += amount;
      } else {
        partySummary.customerPaid += amount;
      }
    }

    const unallocatedAmount = Math.max(Number(payment.amount ?? 0) - allocatedAmount, 0);
    if (partyTypes.get(payment.partyId) === 'SUPPLIER') {
      partySummary.supplierPaid += unallocatedAmount;
    } else {
      partySummary.customerPaid += unallocatedAmount;
    }

    summaries.set(payment.partyId, partySummary);
  }

  for (const [partyId, summary] of summaries.entries()) {
    summaries.set(partyId, finalizeAccountSummary(summary));
  }

  return summaries;
}

export async function getPartyNames() {
  try {
    const parties = await prisma.party.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    const memoryParties = getMemoryParties()
      .map((party) => ({ id: party.id, name: party.name }));
    const mergedParties = [...parties.map((party) => ({ id: party.id, name: party.name })), ...memoryParties];
    const uniqueParties = Array.from(new Map(mergedParties.map((party) => [party.id, party])).values());

    return uniqueParties.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    return getMemoryParties()
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
