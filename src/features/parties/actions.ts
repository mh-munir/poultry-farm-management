'use server';

import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/server/db';
import { requireUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

type PartyWhereInput = NonNullable<NonNullable<Parameters<typeof prisma.party.findMany>[0]>['where']>;
type PaymentUpdateData = NonNullable<Parameters<typeof prisma.payment.update>[0]>['data'];

const partySchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, 'Party name is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  taxNumber: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  openingBalance: z.coerce.number().default(0),
  feedQuantity: z.coerce.number().min(0).optional(),
  feedPrice: z.coerce.number().min(0).optional(),
  feedName: z.string().optional(),
  medicineQuantity: z.coerce.number().min(0).optional(),
  medicinePrice: z.coerce.number().min(0).optional(),
  mediaName: z.string().optional(),
  farmName: z.string().optional(),
  isActive: z.preprocess((val) => val === 'on' || val === true, z.boolean()),
  existingImageUrl: z.string().optional()
});

const BUCKET_NAME = 'party-images';
const PARTY_IMAGE_CONTENT_TYPE = 'image/webp';
const SUPPORTED_PARTY_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const PARTY_IMAGE_ERROR_MESSAGE = 'Please upload a valid JPG, JPEG, PNG, or WebP image.';

function getImageContentType(fileName: string, fileType: string) {
  if (fileType) {
    return fileType;
  }

  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

async function uploadPartyImage(
  partyId: number,
  imageFile: File
): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();

  if (!Number.isFinite(partyId) || partyId <= 0) {
    throw new Error(`Cannot upload party image: invalid partyId (${partyId})`);
  }

  const filePath = `${partyId}/${randomUUID()}.webp`;

  const arrayBuffer = await imageFile.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  const fileData = await sharp(inputBuffer).webp({ quality: 85 }).toBuffer();

  console.error('PARTY IMAGE UPLOAD DEBUG', {
    bucketName: BUCKET_NAME,
    filePath,
    filePathType: typeof filePath,
  });

  const { error: uploadError } = await supabaseAdmin.storage
    .from('party-images')
    .upload(filePath, fileData, {
      contentType: 'image/webp',
      upsert: false,
    });

  if (uploadError) {
    console.error('Party image upload failed:', uploadError);
    throw new Error(`Party image upload failed: ${uploadError.message}`);
  }

  const { data } = supabaseAdmin.storage
    .from('party-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

async function deleteOldImage(imageUrl: string | null | undefined) {
  if (!imageUrl) return;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const url = new URL(imageUrl);
    // The path in Supabase Storage is everything after the bucket name.
    // e.g., https://<...>.supabase.co/storage/v1/object/public/party-images/1/uuid.webp
    // The path to delete is '1/uuid.webp'
    const pathToDelete = url.pathname.split(`/${BUCKET_NAME}/`)[1];

    if (pathToDelete) {
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([pathToDelete]);
    }
  } catch (error) {
    // Log the error but don't block the update if deletion fails
    console.error('Failed to delete old party image from Supabase Storage:', error);
  }
}

type PartySummaryTransaction = {
  transactionType: string;
  totalAmount: { toString(): string };
  paidAmount: { toString(): string };
  dueAmount: { toString(): string };
};

type PartySummaryPayment = {
  amount: { toString(): string };
  allocations: Array<{ id: number }>;
};

type PartyListRecord = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  partyType: string;
  taxNumber: string | null;
  creditLimit: Decimal | null;
  openingBalance: Decimal;
  feedQuantity: Decimal | null;
  feedPrice: Decimal | null;
  feedName: string | null;
  medicineName: string | null;
  medicineQuantity: Decimal | null;
  medicinePrice: Decimal | null;
  imageUrl: string | null;
  mediaName: string | null;
  farmName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  _count: {
    transactions: number;
  };
  transactions: PartySummaryTransaction[];
  payments: PartySummaryPayment[];
};

function toNumber(value: number | string | { toString(): string } | null | undefined) {
  return Number(value?.toString() ?? 0);
}

function getStandalonePaymentTotal(payments: PartySummaryPayment[]) {
  return payments.reduce((total, payment) => {
    if (payment.allocations.length > 0) {
      return total;
    }

    return total + toNumber(payment.amount);
  }, 0);
}

function summarizePartyAccount(partyType: string, transactions: PartySummaryTransaction[], payments: PartySummaryPayment[] = []) {
  let customerInvoiced = 0;
  let customerPaid = 0;
  let customerDue = 0;
  let supplierInvoiced = 0;
  let supplierPaid = 0;
  let supplierDue = 0;
  let standalonePayment = getStandalonePaymentTotal(payments);

  for (const transaction of transactions) {
    const totalAmount = toNumber(transaction.totalAmount);
    const paidAmount = toNumber(transaction.paidAmount);
    const dueAmount = toNumber(transaction.dueAmount);

    if (transaction.transactionType === 'SALE') {
      customerInvoiced += totalAmount;
      customerPaid += paidAmount;
      customerDue += dueAmount;
    }

    if (transaction.transactionType === 'PURCHASE') {
      supplierInvoiced += totalAmount;
      supplierPaid += paidAmount;
      supplierDue += dueAmount;
    }

    if (transaction.transactionType === 'PAYMENT') {
      standalonePayment += totalAmount;
    }
  }

  if (partyType === 'SUPPLIER') {
    supplierPaid += standalonePayment;
    supplierDue = Math.max(0, supplierDue - standalonePayment);
  } else {
    customerPaid += standalonePayment;
    customerDue = Math.max(0, customerDue - standalonePayment);
  }

  const offsetApplied = Math.min(customerDue, supplierDue);
  const netCustomerDue = Math.max(0, customerDue - offsetApplied);
  const netSupplierDue = Math.max(0, supplierDue - offsetApplied);

  return {
    customerInvoiced,
    customerPaid,
    customerDue,
    supplierInvoiced,
    supplierPaid,
    supplierDue,
    offsetApplied,
    netCustomerDue,
    netSupplierDue,
    totalInvoiced: customerInvoiced + supplierInvoiced,
    totalPaid: customerPaid + supplierPaid,
    totalDue: netCustomerDue + netSupplierDue
  };
}

export async function createOrUpdateParty(formData: FormData) {
  await requireUser();

  const rawData = Object.fromEntries(formData.entries());
  const parsed = partySchema.safeParse(rawData);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? 'Invalid data provided.' };
  }

  const { id, existingImageUrl, ...data } = parsed.data;
  const imageFile = formData.get('image') as File | null;

  try {
    const party = await prisma.party.upsert({
      where: { id: id ?? -1 },
      create: {
        ...data,
        imageUrl: null // Set to null initially, will be updated after upload
      },
      update: {
        ...data
      }
    });

    let newImageUrl = existingImageUrl || party.imageUrl;

    // Handle image upload if a new file is provided
    if (imageFile && imageFile.size > 0) {
      // Delete the old image from Supabase Storage if it exists
      await deleteOldImage(existingImageUrl);

      // Upload the new image and get its public URL
      newImageUrl = await uploadPartyImage(party.id, imageFile);

      // Update the party record with the new image URL
      await prisma.party.update({
        where: { id: party.id },
        data: { imageUrl: newImageUrl }
      });
    }

    revalidatePath('/dashboard/parties');

    return {
      success: true,
      message: `Party '${data.name}' ${id ? 'updated' : 'created'} successfully.`
    };
  } catch (error: any) {
    console.error('Error creating/updating party:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.'
    };
  }
}

const deletePartySchema = z.object({
  partyId: z.coerce.number()
});

export async function deleteParty(formData: FormData) {
  await requireUser();
  const parsed = deletePartySchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { success: false, message: 'Invalid party ID.' };
  }

  const { partyId } = parsed.data;

  try {
    const party = await prisma.party.findUnique({
      where: { id: partyId }
    });

    if (!party) {
      return { success: false, message: 'Party not found.' };
    }

    // Delete image from Supabase Storage
    if (party.imageUrl) {
      await deleteOldImage(party.imageUrl);
    }

    // Use a transaction to delete the party and all related records
    await prisma.$transaction([
      prisma.transactionItem.deleteMany({ where: { transaction: { partyId } } }),
      prisma.transaction.deleteMany({ where: { partyId } }),
      prisma.party.delete({ where: { id: partyId } })
    ]);

    revalidatePath('/dashboard/parties');
    return { success: true, message: `Party '${party.name}' and all related data have been deleted.` };
  } catch (error: any) {
    console.error('Error deleting party:', error);
    return { success: false, message: 'Failed to delete party.' };
  }
}

export async function getPartyAccountSummary(partyId: number) {
  await requireUser();
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      partyType: true,
      transactions: {
        select: {
          transactionType: true,
          totalAmount: true,
          paidAmount: true,
          dueAmount: true
        }
      },
      payments: {
        select: {
          amount: true,
          allocations: {
            select: {
              id: true
            }
          }
        }
      }
    }
  });

  if (!party) {
    notFound();
  }

  return summarizePartyAccount(party.partyType, party.transactions, party.payments);
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
  await requireUser();
  const take = 8;
  const skip = (Math.max(page, 1) - 1) * take;
  const filters: PartyWhereInput[] = [];

  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    });
  }

  if (partyType && partyType !== 'ALL') {
    filters.push({ partyType });
  }

  if (status && status !== 'ALL') {
    filters.push({ isActive: status === 'ACTIVE' });
  }

  const where: PartyWhereInput = filters.length > 0 ? { AND: filters } : {};

  const [parties, total] = await prisma.$transaction([
    prisma.party.findMany({
      where,
      include: {
        _count: {
          select: {
            transactions: true
          }
        },
        transactions: {
          select: {
            transactionType: true,
            totalAmount: true,
            paidAmount: true,
            dueAmount: true
          }
        },
        payments: {
          select: {
            amount: true,
            allocations: {
              select: {
                id: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip
    }),
    prisma.party.count({ where })
  ]);

  const totalPages = Math.ceil(total / take);
  const partiesWithTotals = (parties as PartyListRecord[]).map(({ transactions, payments, ...party }) => ({
    ...party,
    ...summarizePartyAccount(party.partyType, transactions, payments)
  }));

  return {
    parties: partiesWithTotals,
    total,
    totalPages,
    page
  };
}

export async function getPartyStats(args: { search?: string; partyType?: string; status?: string }) {
  await requireUser();
  const filters: PartyWhereInput[] = [];

  if (args.search) {
    filters.push({
      OR: [
        { name: { contains: args.search, mode: 'insensitive' } }
      ]
    });
  }

  if (args.partyType && args.partyType !== 'ALL') {
    filters.push({ partyType: args.partyType });
  }

  if (args.status && args.status !== 'ALL') {
    filters.push({ isActive: args.status === 'ACTIVE' });
  }

  const where: PartyWhereInput = filters.length > 0 ? { AND: filters } : {};

  const total = await prisma.party.count({ where });
  const active = await prisma.party.count({ where: { ...where, isActive: true } });
  const customers = await prisma.party.count({ where: { ...where, partyType: 'CUSTOMER' } });
  const suppliers = await prisma.party.count({ where: { ...where, partyType: 'SUPPLIER' } });

  return { total, active, customers, suppliers };
}

export async function getPartyNames() {
  await requireUser();
  return prisma.party.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
}

const paymentBaseSchema = z.object({
  partyId: z.coerce.number({ required_error: 'Party ID is missing.' }),
  amount: z.coerce.number().min(0.01, 'Payment amount must be positive.'),
  paymentMethod: z.string().min(1, 'Payment method is required.'),
  referenceNumber: z.string().optional().or(z.literal('')),
  status: z.string().optional().default('COMPLETED'),
  notes: z.string().optional()
});

const createPaymentSchema = paymentBaseSchema.extend({
  paymentDate: z.preprocess((value) => value || new Date(), z.coerce.date())
});

const updatePaymentSchema = paymentBaseSchema.extend({
  paymentId: z.coerce.number(),
  paymentDate: z.preprocess((value) => value || undefined, z.coerce.date().optional())
});

export async function recordPaymentForParty(formData: FormData) {
  const session = await requireUser();
  const rawData = Object.fromEntries(formData.entries());
  const parsed = createPaymentSchema.safeParse(rawData);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid data.' };
  }

  const { partyId, amount, paymentDate, paymentMethod, referenceNumber, status, notes } = parsed.data;

  try {
    await prisma.payment.create({
      data: {
        partyId,
        paymentDate,
        paymentMethod,
        amount,
        referenceNumber: referenceNumber || null,
        status,
        notes: notes || null,
        createdById: session.user.id
      }
    });
    revalidatePath(`/dashboard/parties/${partyId}`);
    revalidatePath('/dashboard/parties');
    return { success: true, message: 'Payment recorded successfully.' };
  } catch (error) {
    console.error('Error recording payment:', error);
    return { success: false, message: 'Failed to record payment.' };
  }
}

export async function updatePaymentForParty(formData: FormData) {
  await requireUser();
  const rawData = Object.fromEntries(formData.entries());
  const parsed = updatePaymentSchema.safeParse(rawData);

  if (!parsed.success || !parsed.data.paymentId) {
    return { success: false, message: parsed.error?.issues[0]?.message ?? 'Invalid data for update.' };
  }

  const { paymentId, partyId, amount, paymentDate, paymentMethod, referenceNumber, status, notes } = parsed.data;

  try {
    const paymentData: PaymentUpdateData = {
      amount,
      paymentMethod,
      referenceNumber: referenceNumber || null,
      status,
      notes: notes || null
    };

    if (paymentDate) {
      paymentData.paymentDate = paymentDate;
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: paymentData
    });
    revalidatePath(`/dashboard/parties/${partyId}`);
    revalidatePath('/dashboard/parties');
    return { success: true, message: 'Payment updated successfully.' };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { success: false, message: 'Failed to update payment.' };
  }
}

export async function deletePaymentForParty(formData: FormData) {
  await requireUser();
  const paymentId = Number(formData.get('paymentId'));
  const partyId = Number(formData.get('partyId'));

  if (!paymentId || !partyId) {
    return { success: false, message: 'Invalid ID for deletion.' };
  }

  await prisma.payment.delete({ where: { id: paymentId } });

  revalidatePath(`/dashboard/parties/${partyId}`);
  revalidatePath('/dashboard/parties');
  return { success: true, message: 'Payment deleted successfully.' };
}
