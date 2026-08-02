'use server';

import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';
import { requireUser } from '@/lib/auth';
import { CACHE_TAGS, revalidatePartyData, revalidatePurchaseData } from '@/lib/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { queueTransactionSmsNotification } from '@/lib/sms/service';
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
  partyType: z.enum(['CUSTOMER', 'PARTY', 'BOTH']),
  taxNumber: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  openingBalance: z.coerce.number().default(0),
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
  if (!Number.isFinite(partyId) || partyId <= 0) {
    throw new Error(`Cannot upload party image: invalid partyId (${partyId})`);
  }

  // Build a safe, relative storage object path (bucket name must NOT be included)
  const safePartyId = String(partyId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${randomUUID()}.webp`;
  const filePath = `${safePartyId}/${fileName}`;

  const supabaseAdmin = getSupabaseAdmin();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const bucketName = BUCKET_NAME.trim();

  if (!supabaseUrl) {
    throw new Error('Supabase URL is not configured');
  }

  if (!bucketName || bucketName !== 'party-images') {
    throw new Error(`Invalid Supabase Storage bucket configuration: ${JSON.stringify(bucketName)}`);
  }

  if (
    !filePath ||
    filePath.startsWith('/') ||
    filePath.includes('://') ||
    filePath.includes('undefined') ||
    filePath.includes('null')
  ) {
    throw new Error(`Invalid Supabase Storage object path: ${JSON.stringify(filePath)}`);
  }

  const arrayBuffer = await imageFile.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  const fileData = await sharp(inputBuffer).webp({ quality: 85 }).toBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from('party-images')
    .upload(filePath, fileData, {
      contentType: PARTY_IMAGE_CONTENT_TYPE,
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
  transactionDate: Date;
};

type PartySummaryPayment = {
  amount: { toString(): string };
  paymentDate: Date;
  allocations: Array<{ id: number }>;
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
  let partySupplierInvoiced = 0;
  let partySupplierPaid = 0;
  let partySupplierDue = 0;
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
      partySupplierInvoiced += totalAmount;
      partySupplierPaid += paidAmount;
      partySupplierDue += dueAmount;
    }

    if (transaction.transactionType === 'PAYMENT') {
      standalonePayment += totalAmount;
    }
  }

  if (partyType === 'PARTY') {
    partySupplierPaid += standalonePayment;
    partySupplierDue = Math.max(0, partySupplierDue - standalonePayment);
  } else {
    customerPaid += standalonePayment;
    customerDue = Math.max(0, customerDue - standalonePayment);
  }

  const offsetApplied = Math.min(customerDue, partySupplierDue);
  const netCustomerDue = Math.max(0, customerDue - offsetApplied);
  const netPartySupplierDue = Math.max(0, partySupplierDue - offsetApplied);

  return {
    customerInvoiced,
    customerPaid,
    customerDue,
    supplierInvoiced: partySupplierInvoiced,
    supplierPaid: partySupplierPaid,
    supplierDue: partySupplierDue,
    offsetApplied,
    netCustomerDue,
    netSupplierDue: netPartySupplierDue,
    totalInvoiced: customerInvoiced + partySupplierInvoiced,
    totalPaid: customerPaid + partySupplierPaid,
    totalDue: netCustomerDue + netPartySupplierDue
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

    revalidatePartyData(party.id);

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

    revalidatePartyData(partyId);
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
    select: { partyType: true }
  });

  if (!party) {
    notFound();
  }

  const [txnSummary, paymentSummary] = await Promise.all([
    prisma.$queryRaw<Array<{ transactionType: string; totalAmount: any; paidAmount: any; dueAmount: any }>>`
      SELECT "transactionType", SUM("totalAmount") AS "totalAmount", SUM("paidAmount") AS "paidAmount", SUM("dueAmount") AS "dueAmount"
      FROM "Transaction"
      WHERE "partyId" = ${partyId}
      GROUP BY "transactionType"
    `,
    prisma.$queryRaw<Array<{ totalPaid: any }>>`
      SELECT COALESCE(SUM("amount"), 0) AS "totalPaid"
      FROM "Payment" p
      WHERE p."partyId" = ${partyId}
        AND NOT EXISTS (
          SELECT 1 FROM "PaymentAllocation" pa WHERE pa."paymentId" = p."id"
        )
    `
  ]);

  let customerInvoiced = 0;
  let customerPaid = 0;
  let customerDue = 0;
  let partySupplierInvoiced = 0;
  let partySupplierPaid = 0;
  let partySupplierDue = 0;

  for (const row of txnSummary as Array<{ transactionType: string; totalAmount: any; paidAmount: any; dueAmount: any }>) {
    const totalAmount = Number(row.totalAmount ?? 0);
    const paidAmount = Number(row.paidAmount ?? 0);
    const dueAmount = Number(row.dueAmount ?? 0);
    if (row.transactionType === 'SALE') {
      customerInvoiced += totalAmount;
      customerPaid += paidAmount;
      customerDue += dueAmount;
    }
    if (row.transactionType === 'PURCHASE') {
      partySupplierInvoiced += totalAmount;
      partySupplierPaid += paidAmount;
      partySupplierDue += dueAmount;
    }
  }

  const standalonePayment = Number((paymentSummary[0] as any)?.totalPaid ?? 0);

  if (party.partyType === 'PARTY') {
    partySupplierPaid += standalonePayment;
    partySupplierDue = Math.max(0, partySupplierDue - standalonePayment);
  } else {
    customerPaid += standalonePayment;
    customerDue = Math.max(0, customerDue - standalonePayment);
  }

  const offsetApplied = Math.min(customerDue, partySupplierDue);
  const netCustomerDue = Math.max(0, customerDue - offsetApplied);
  const netPartySupplierDue = Math.max(0, partySupplierDue - offsetApplied);

  return {
    customerInvoiced,
    customerPaid,
    customerDue,
    supplierInvoiced: partySupplierInvoiced,
    supplierPaid: partySupplierPaid,
    supplierDue: partySupplierDue,
    offsetApplied,
    netCustomerDue,
    netSupplierDue: netPartySupplierDue,
    totalInvoiced: customerInvoiced + partySupplierInvoiced,
    totalPaid: customerPaid + partySupplierPaid,
    totalDue: netCustomerDue + netPartySupplierDue
  };
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

  const [parties, total] = await Promise.all([
    prisma.party.findMany({
      where,
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
        imageUrl: true,
        mediaName: true,
        farmName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdById: true
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take
    }),
    prisma.party.count({ where })
  ]);

  const partyIds = parties.map((party) => party.id);
  const [transactionSummary, standalonePayments, lastActivity] = partyIds.length === 0
    ? [[], [], []] as [
        Array<{ partyId: number; transactionType: string; totalAmount: any; paidAmount: any; dueAmount: any }>,
        Array<{ partyId: number; totalPaid: any }>,
        Array<{ partyId: number; lastActivityAt: Date | null }>
      ]
    : await Promise.all([
        prisma.$queryRaw<Array<{ partyId: number; transactionType: string; totalAmount: any; paidAmount: any; dueAmount: any }>>`
          SELECT "partyId", "transactionType",
            SUM("totalAmount") AS "totalAmount",
            SUM("paidAmount") AS "paidAmount",
            SUM("dueAmount") AS "dueAmount"
          FROM "Transaction"
          WHERE "partyId" IN (${Prisma.join(partyIds)})
          GROUP BY "partyId", "transactionType"
        `,
        prisma.$queryRaw<Array<{ partyId: number; totalPaid: any }>>`
          SELECT p."partyId", COALESCE(SUM(p."amount"), 0) AS "totalPaid"
          FROM "Payment" p
          WHERE p."partyId" IN (${Prisma.join(partyIds)})
            AND NOT EXISTS (
              SELECT 1 FROM "PaymentAllocation" pa WHERE pa."paymentId" = p."id"
            )
          GROUP BY p."partyId"
        `,
        prisma.$queryRaw<Array<{ partyId: number; lastActivityAt: Date | null }>>`
          SELECT "partyId", MAX("activityAt") AS "lastActivityAt"
          FROM (
            SELECT "partyId", "transactionDate" AS "activityAt"
            FROM "Transaction"
            WHERE "partyId" IN (${Prisma.join(partyIds)})
            UNION ALL
            SELECT "partyId", "paymentDate" AS "activityAt"
            FROM "Payment"
            WHERE "partyId" IN (${Prisma.join(partyIds)})
          ) activity
          GROUP BY "partyId"
        `
      ]);

  const transactionMap = new Map<number, PartySummaryTransaction[]>();
  for (const row of transactionSummary) {
    const rows = transactionMap.get(row.partyId) ?? [];
    rows.push({
      transactionType: row.transactionType,
      totalAmount: row.totalAmount ?? 0,
      paidAmount: row.paidAmount ?? 0,
      dueAmount: row.dueAmount ?? 0,
      transactionDate: new Date()
    });
    transactionMap.set(row.partyId, rows);
  }

  const paymentMap = new Map<number, PartySummaryPayment[]>();
  for (const row of standalonePayments) {
    paymentMap.set(row.partyId, [{
      amount: row.totalPaid ?? 0,
      paymentDate: new Date(),
      allocations: []
    }]);
  }

  const lastActivityMap = new Map(lastActivity.map((row) => [row.partyId, row.lastActivityAt]));

  const totalPages = Math.ceil(total / take);
  const partiesWithTotals = parties.map((party) => {
    const transactions = transactionMap.get(party.id) ?? [];
    const payments = paymentMap.get(party.id) ?? [];
    const lastTransactionDate = lastActivityMap.get(party.id) ?? null;

    return {
      ...party,
      lastTransactionDate,
      ...summarizePartyAccount(party.partyType, transactions, payments)
    };
  }).sort((a, b) => {
    if (a.lastTransactionDate && b.lastTransactionDate) {
      return b.lastTransactionDate.getTime() - a.lastTransactionDate.getTime();
    }
    if (a.lastTransactionDate) return -1;
    if (b.lastTransactionDate) return 1;
    return 0;
  });

  return {
    parties: partiesWithTotals,
    total,
    totalPages: Math.max(1, totalPages),
    page: Math.min(page, Math.max(1, totalPages))
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

  const rows = await prisma.party.groupBy({
    by: ['isActive', 'partyType'],
    where,
    _count: { _all: true }
  });

  const total = rows.reduce((sum, row) => sum + row._count._all, 0);
  const activeParties = rows.reduce((sum, row) => sum + (row.isActive ? row._count._all : 0), 0);
  const customers = rows.reduce((sum, row) => sum + (row.partyType === 'CUSTOMER' ? row._count._all : 0), 0);
  const suppliers = rows.reduce((sum, row) => sum + (row.partyType === 'PARTY' ? row._count._all : 0), 0);

  return { total, active: activeParties, customers, parties: suppliers, companies: 0, suppliers: suppliers };
}

const getPartyNamesCached = unstable_cache(
  async () => prisma.party.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ['party-name-options'],
  { tags: [CACHE_TAGS.parties], revalidate: 300 }
);

const getCustomerOptionsCached = unstable_cache(
  async () =>
    prisma.party.findMany({
      where: { partyType: { in: ['CUSTOMER', 'BOTH'] }, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
  ['customer-options'],
  { tags: [CACHE_TAGS.parties], revalidate: 300 }
);

const getSupplierOptionsCached = unstable_cache(
  async () =>
    prisma.party.findMany({
      where: { partyType: { in: ['PARTY', 'BOTH'] }, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
  ['supplier-options'],
  { tags: [CACHE_TAGS.parties], revalidate: 300 }
);

export async function getPartyNames() {
  await requireUser();
  return getPartyNamesCached();
}

export async function getCustomerOptions() {
  await requireUser();
  return getCustomerOptionsCached();
}

export async function getSupplierOptions() {
  await requireUser();
  return getSupplierOptionsCached();
}

export async function getCustomerCurrentDue(partyId: number) {
  await requireUser();
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { partyType: true }
  });

  if (!party) {
    return 0;
  }

  const [saleAgg, paymentAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { partyId, transactionType: 'SALE' },
      _sum: { totalAmount: true, paidAmount: true, dueAmount: true }
    }),
    prisma.$queryRaw<Array<{ totalPaid: any }>>`
      SELECT COALESCE(SUM("amount"), 0) AS "totalPaid"
      FROM "Payment" p
      WHERE p."partyId" = ${partyId}
        AND NOT EXISTS (
          SELECT 1 FROM "PaymentAllocation" pa WHERE pa."paymentId" = p."id"
        )
    `
  ]);

  const customerDue = Number(saleAgg._sum.dueAmount ?? 0);
  const standalonePayment = Number(paymentAgg[0]?.totalPaid ?? 0);

  if (party.partyType === 'PARTY') {
    return Math.max(0, customerDue);
  }

  return Math.max(0, customerDue - standalonePayment);
}

export async function getSupplierCurrentPayable(partyId: number) {
  await requireUser();
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { partyType: true }
  });

  if (!party) {
    return 0;
  }

  const [purchaseAgg, paymentAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { partyId, transactionType: 'PURCHASE' },
      _sum: { totalAmount: true, paidAmount: true, dueAmount: true }
    }),
    prisma.$queryRaw<Array<{ totalPaid: any }>>`
      SELECT COALESCE(SUM("amount"), 0) AS "totalPaid"
      FROM "Payment" p
      WHERE p."partyId" = ${partyId}
        AND NOT EXISTS (
          SELECT 1 FROM "PaymentAllocation" pa WHERE pa."paymentId" = p."id"
        )
    `
  ]);

  const supplierDue = Number(purchaseAgg._sum.dueAmount ?? 0);
  const standalonePayment = Number(paymentAgg[0]?.totalPaid ?? 0);

  if (party.partyType === 'CUSTOMER') {
    return Math.max(0, supplierDue);
  }

  return Math.max(0, supplierDue - standalonePayment);
}

const paymentBaseSchema = z.object({
  partyId: z.coerce.number({ required_error: 'Party is required.' }),
  amount: z.coerce.number().min(0.01, 'Payment amount must be greater than zero.'),
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
    const payment = await prisma.payment.create({
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
    const partyDetails = await prisma.party.findUnique({ where: { id: partyId }, select: { id: true, name: true, phone: true } });

    if (partyDetails) {
      await queueTransactionSmsNotification({
        partyId: partyDetails.id,
        transactionId: null,
        phoneNumber: partyDetails.phone,
        partyName: partyDetails.name,
        message: `প্রিয় ${partyDetails.name}, আপনার payment received হয়েছে। Amount: ৳${Number(amount).toFixed(2)}. ধন্যবাদ।`,
        saleType: 'MIXED',
        transactionType: 'PAYMENT_RECEIVED'
      });
    }

    revalidatePartyData(partyId);
    return { success: true, message: 'Payment recorded successfully.' };
  } catch (error) {
    console.error('Error recording payment:', error);
    return { success: false, message: 'Failed to record payment.' };
  }
}

export async function receiveCustomerPayment(formData: FormData) {
  const session = await requireUser();
  const rawData = Object.fromEntries(formData.entries());
  const parsed = createPaymentSchema.safeParse(rawData);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid data.' };
  }

  const { partyId, amount, paymentDate, paymentMethod, referenceNumber, status, notes } = parsed.data;

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { partyType: true }
  });

  if (!party) {
    return { success: false, message: 'Party not found.' };
  }

  if (party.partyType !== 'CUSTOMER' && party.partyType !== 'BOTH') {
    return { success: false, message: 'Selected party is not a customer.' };
  }

  const currentDue = await getCustomerCurrentDue(partyId);

  if (amount > currentDue) {
    return { success: false, message: `Payment amount cannot exceed current customer due of ৳${currentDue.toFixed(2)}.` };
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        partyId,
        paymentDate,
        paymentMethod,
        amount: new Prisma.Decimal(amount),
        referenceNumber: referenceNumber || null,
        status,
        notes: notes || null,
        createdById: session.user.id
      }
    });

    const lastLedger = await prisma.ledgerEntry.findFirst({
      where: { partyId },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
    });
    const previousBalance = new Prisma.Decimal(lastLedger?.runningBalance ?? 0);
    const newBalance = previousBalance.minus(new Prisma.Decimal(amount));

    await prisma.ledgerEntry.create({
      data: {
        partyId,
        paymentId: payment.id,
        entryType: 'PAYMENT_RECEIVED',
        amount: new Prisma.Decimal(-amount),
        runningBalance: newBalance,
        description: `Customer payment received`,
        referenceNumber: referenceNumber || undefined,
        createdById: session.user.id
      }
    });

    const partyDetails = await prisma.party.findUnique({ where: { id: partyId }, select: { id: true, name: true, phone: true } });

    if (partyDetails) {
      await queueTransactionSmsNotification({
        partyId: partyDetails.id,
        transactionId: null,
        phoneNumber: partyDetails.phone,
        partyName: partyDetails.name,
        message: `প্রিয় ${partyDetails.name}, আপনার payment received হয়েছে। Amount: ৳${Number(amount).toFixed(2)}. ধন্যবাদ।`,
        saleType: 'MIXED',
        transactionType: 'PAYMENT_RECEIVED'
      });
    }

    revalidatePartyData(partyId);
    return { success: true, message: 'Customer payment recorded successfully.' };
  } catch (error) {
    console.error('Error recording customer payment:', error);
    return { success: false, message: 'Failed to record customer payment.' };
  }
}

export async function paySupplierPayment(formData: FormData) {
  const session = await requireUser();
  const rawData = Object.fromEntries(formData.entries());
  const parsed = createPaymentSchema.safeParse(rawData);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid data.' };
  }

  const { partyId, amount, paymentDate, paymentMethod, referenceNumber, status, notes } = parsed.data;

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { partyType: true }
  });

  if (!party) {
    return { success: false, message: 'Party not found.' };
  }

  if (party.partyType !== 'PARTY' && party.partyType !== 'BOTH') {
    return { success: false, message: 'Selected party is not a supplier.' };
  }

  const currentPayable = await getSupplierCurrentPayable(partyId);

  if (amount > currentPayable) {
    return { success: false, message: `Payment amount cannot exceed current supplier payable of ৳${currentPayable.toFixed(2)}.` };
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        partyId,
        paymentDate,
        paymentMethod,
        amount: new Prisma.Decimal(amount),
        referenceNumber: referenceNumber || null,
        status,
        notes: notes || null,
        createdById: session.user.id
      }
    });

    const lastLedger = await prisma.ledgerEntry.findFirst({
      where: { partyId },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
    });
    const previousBalance = new Prisma.Decimal(lastLedger?.runningBalance ?? 0);
    const newBalance = previousBalance.minus(new Prisma.Decimal(amount));

    await prisma.ledgerEntry.create({
      data: {
        partyId,
        paymentId: payment.id,
        entryType: 'PAYMENT_PAID',
        amount: new Prisma.Decimal(-amount),
        runningBalance: newBalance,
        description: `Payment made to supplier`,
        referenceNumber: referenceNumber || undefined,
        createdById: session.user.id
      }
    });

    const partyDetails = await prisma.party.findUnique({ where: { id: partyId }, select: { id: true, name: true, phone: true } });

    if (partyDetails) {
      await queueTransactionSmsNotification({
        partyId: partyDetails.id,
        transactionId: null,
        phoneNumber: partyDetails.phone,
        partyName: partyDetails.name,
        message: `প্রিয় ${partyDetails.name}, আপনার payment paid হয়েছে। Amount: ৳${Number(amount).toFixed(2)}. ধন্যবাদ।`,
        saleType: 'MIXED',
        transactionType: 'PAYMENT_PAID'
      });
    }

    revalidatePartyData(partyId);
    return { success: true, message: 'Supplier payment recorded successfully.' };
  } catch (error) {
    console.error('Error recording supplier payment:', error);
    return { success: false, message: 'Failed to record supplier payment.' };
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
    revalidatePartyData(partyId);
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

  revalidatePartyData(partyId);
  return { success: true, message: 'Payment deleted successfully.' };
}

const supplierPurchaseSchema = z.object({
  partyId: z.coerce.number({ required_error: 'Supplier is required.' }),
  purchaseDate: z.preprocess((value) => value || new Date(), z.coerce.date()),
  productCategory: z.enum(['EGG', 'CHICKEN'], { required_error: 'Product category is required.' }),
  productName: z.string().min(1, 'Product name is required.'),
  quantity: z.coerce.number().min(0.0001, 'Quantity must be greater than zero.'),
  unit: z.string().min(1, 'Unit is required.'),
  unitPrice: z.coerce.number().min(0.01, 'Unit price must be greater than zero.'),
  totalAmount: z.coerce.number().min(0.01, 'Total amount must be greater than zero.'),
  paidAmount: z.coerce.number().min(0, 'Paid amount cannot be negative.').default(0),
  paymentMethod: z.enum(['Cash', 'Bank', 'Mobile Banking', 'Credit'], { required_error: 'Payment method is required.' }),
  referenceNumber: z.string().optional().or(z.literal('')),
  notes: z.string().optional()
});

export async function createSupplierPurchase(formData: FormData) {
  const session = await requireUser();
  const rawData = Object.fromEntries(formData.entries());
  const parsed = supplierPurchaseSchema.safeParse(rawData);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid data.' };
  }

  const { partyId, purchaseDate, productCategory, productName, quantity, unit, unitPrice, totalAmount, paidAmount, paymentMethod, referenceNumber, notes } = parsed.data;

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { partyType: true }
  });

  if (!party) {
    return { success: false, message: 'Supplier not found.' };
  }

  if (party.partyType !== 'PARTY' && party.partyType !== 'BOTH') {
    return { success: false, message: 'Selected party is not a supplier.' };
  }

  if (paidAmount > totalAmount) {
    return { success: false, message: 'Paid amount cannot exceed total amount.' };
  }

  const invoiceNumber = `SP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const dueAmount = totalAmount - paidAmount;
  const status = dueAmount > 0 ? 'PENDING' : 'COMPLETED';

  try {
    await prisma.$transaction(async (tx) => {
      let productId: number | undefined;

      const existingProduct = await tx.product.findFirst({
        where: {
          name: productName.trim(),
          productType: productCategory
        }
      });

      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        const count = await tx.product.count({
          where: { productType: productCategory }
        });
        const newProduct = await tx.product.create({
          data: {
            code: `${productCategory}-${String(count + 1).padStart(3, '0')}`,
            name: productName.trim(),
            productType: productCategory,
            unit: unit,
            isActive: true
          }
        });
        productId = newProduct.id;
      }

      const purchase = await tx.transaction.create({
        data: {
          transactionType: 'PURCHASE',
          partyId,
          transactionDate: purchaseDate,
          invoiceNumber,
          status,
          subtotal: new Prisma.Decimal(totalAmount),
          discount: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          dueAmount: new Prisma.Decimal(dueAmount),
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          transactionItems: {
            create: {
              productId: productId,
              quantity: new Prisma.Decimal(quantity),
              unitPrice: new Prisma.Decimal(unitPrice),
              lineTotal: new Prisma.Decimal(totalAmount),
              taxAmount: new Prisma.Decimal(0),
              description: `${productCategory} - ${productName} (${quantity} ${unit})`
            }
          }
        }
      });

      const lastLedger = await tx.ledgerEntry.findFirst({
        where: { partyId },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
      });
      const previousBalance = new Prisma.Decimal(lastLedger?.runningBalance ?? 0);
      const purchaseBalance = previousBalance.plus(new Prisma.Decimal(totalAmount));

      await tx.ledgerEntry.create({
        data: {
          partyId,
          transactionId: purchase.id,
          entryType: 'PURCHASE',
          amount: new Prisma.Decimal(totalAmount),
          runningBalance: purchaseBalance,
          description: `Supplier purchase - ${productName}`,
          referenceNumber: invoiceNumber,
          createdById: session.user.id
        }
      });

      if (paidAmount > 0) {
        const paymentRecord = await tx.payment.create({
          data: {
            partyId,
            paymentDate: purchaseDate,
            paymentMethod,
            amount: new Prisma.Decimal(paidAmount),
            referenceNumber: referenceNumber || null,
            status: paidAmount < totalAmount ? 'PARTIAL' : 'COMPLETED',
            notes: notes || null
          }
        });

        await tx.ledgerEntry.create({
          data: {
            partyId,
            transactionId: purchase.id,
            paymentId: paymentRecord.id,
            entryType: 'PAYMENT_PAID',
            amount: new Prisma.Decimal(-paidAmount),
            runningBalance: purchaseBalance.minus(new Prisma.Decimal(paidAmount)),
            description: `Payment for supplier purchase - ${productName}`,
            referenceNumber: referenceNumber || undefined,
            createdById: session.user.id
          }
        });
      }
    });

    revalidatePurchaseData({ partyId });
    return { success: true, message: 'Supplier purchase recorded successfully.' };
  } catch (error) {
    console.error('Error recording supplier purchase:', error);
    return { success: false, message: 'Failed to record supplier purchase.' };
  }
}
