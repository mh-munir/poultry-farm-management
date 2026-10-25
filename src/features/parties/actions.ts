'use server';

import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';
import { requireUser } from '@/lib/auth';
import { rebuildLedgerRunningBalancesForAccount } from '@/features/purchases/actions';
import { DEFAULT_PAGE_SIZE } from '@/config/pagination';
import { CACHE_TAGS, revalidateInventoryData, revalidatePartyData, revalidatePurchaseData } from '@/lib/cache';
import { getInvoiceNumber, isUniqueConstraintError } from '@/lib/invoice';
import { getSupabaseAdmin } from '@/lib/supabase';
import { queueTransactionSmsNotification } from '@/lib/sms/service';
import { createPaymentPaidSmsMessage, createPaymentReceivedSmsMessage } from '@/lib/sms/templates';
import { getPartyFinancialSummary } from './accounting';
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
  openingBalanceAmount: z.coerce.number().min(0).default(0),
  openingBalanceType: z.enum(['CUSTOMER_DUE', 'CUSTOMER_ADVANCE']).default('CUSTOMER_DUE'),
  openingBalanceDescription: z.string().optional().or(z.literal('')),
  mediaName: z.string().optional(),
  farmName: z.string().optional(),
  isActive: z.preprocess((val) => val === 'on' || val === true, z.boolean()),
  existingImageUrl: z.string().optional()
});

const BUCKET_NAME = 'party-images';
const PARTY_IMAGE_CONTENT_TYPE = 'image/webp';
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
  paymentDirection: string | null;
};

function toDecimal(value: Prisma.Decimal | number | string | { toString(): string } | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  return new Prisma.Decimal(value?.toString() ?? '0');
}

function summarizePartyAccount(
  partyType: string,
  transactions: PartySummaryTransaction[],
  payments: PartySummaryPayment[] = [],
  openingBalance = 0,
  openingBalanceType: string | null = 'CUSTOMER_DUE'
) {
  let customerInvoiced = new Prisma.Decimal(0);
  let customerPaid = new Prisma.Decimal(0);
  let customerDue = new Prisma.Decimal(0);
  let partySupplierInvoiced = new Prisma.Decimal(0);
  let partySupplierPaid = new Prisma.Decimal(0);
  let partySupplierDue = new Prisma.Decimal(0);
  const standalonePayments = payments.filter((payment) => payment.allocations.length === 0);

  for (const transaction of transactions) {
    const totalAmount = toDecimal(transaction.totalAmount);
    const paidAmount = toDecimal(transaction.paidAmount);
    const dueAmount = toDecimal(transaction.dueAmount);

    if (transaction.transactionType === 'SALE') {
      customerInvoiced = customerInvoiced.plus(totalAmount);
      customerPaid = customerPaid.plus(paidAmount);
      customerDue = customerDue.plus(dueAmount);
    }

    if (transaction.transactionType === 'PURCHASE') {
      partySupplierInvoiced = partySupplierInvoiced.plus(totalAmount);
      partySupplierPaid = partySupplierPaid.plus(paidAmount);
      partySupplierDue = partySupplierDue.plus(dueAmount);
    }

    if (transaction.transactionType === 'PAYMENT') {
      customerPaid = customerPaid.plus(totalAmount);
    }
  }

  const openingAmount = new Prisma.Decimal(Math.abs(openingBalance));
  if (openingBalanceType === 'CUSTOMER_ADVANCE') {
    customerDue = Prisma.Decimal.max(new Prisma.Decimal(0), customerDue.minus(openingAmount));
  } else {
    customerDue = customerDue.plus(openingAmount);
  }

  for (const payment of standalonePayments) {
    const amount = toDecimal(payment.amount);
    const isSupplierPayment = payment.paymentDirection === 'SUPPLIER_PAYMENT'
      || (payment.paymentDirection == null && partyType === 'PARTY');

    if (isSupplierPayment && partyType !== 'CUSTOMER') {
      partySupplierPaid = partySupplierPaid.plus(amount);
      partySupplierDue = Prisma.Decimal.max(new Prisma.Decimal(0), partySupplierDue.minus(amount));
    } else if (partyType !== 'PARTY') {
      customerPaid = customerPaid.plus(amount);
      customerDue = Prisma.Decimal.max(new Prisma.Decimal(0), customerDue.minus(amount));
    }
  }

  const offsetApplied = Prisma.Decimal.min(customerDue, partySupplierDue);
  const netCustomerDue = Prisma.Decimal.max(new Prisma.Decimal(0), customerDue.minus(offsetApplied));
  const netPartySupplierDue = Prisma.Decimal.max(new Prisma.Decimal(0), partySupplierDue.minus(offsetApplied));

  return {
    customerInvoiced: customerInvoiced.toNumber(),
    customerPaid: customerPaid.toNumber(),
    customerDue: customerDue.toNumber(),
    supplierInvoiced: partySupplierInvoiced.toNumber(),
    supplierPaid: partySupplierPaid.toNumber(),
    supplierDue: partySupplierDue.toNumber(),
    offsetApplied: offsetApplied.toNumber(),
    netCustomerDue: netCustomerDue.toNumber(),
    netSupplierDue: netPartySupplierDue.toNumber(),
    totalInvoiced: customerInvoiced.plus(partySupplierInvoiced).toNumber(),
    totalPaid: customerPaid.plus(partySupplierPaid).toNumber(),
    totalDue: netCustomerDue.plus(netPartySupplierDue).toNumber()
  };
}

function normalizeOpeningBalanceValue(amountInput: number, type: 'CUSTOMER_DUE' | 'CUSTOMER_ADVANCE') {
  if (!Number.isFinite(amountInput) || amountInput <= 0) {
    return 0;
  }

  return type === 'CUSTOMER_ADVANCE'
    ? -Math.abs(amountInput)
    : Math.abs(amountInput);
}

async function syncOpeningBalanceLedger({
  tx,
  partyId,
  amount,
  description,
  createdById
}: {
  tx: Prisma.TransactionClient;
  partyId: number;
  amount: number;
  description?: string | null;
  createdById: string;
}) {
  const normalizedAmount = new Prisma.Decimal(amount);
  const normalizedDescription = description?.trim() || 'Opening balance';

  const existingLedger = await tx.ledgerEntry.findFirst({
    where: {
      partyId,
      entryType: 'OPENING_BALANCE'
    },
    orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
    select: { id: true }
  });

  if (existingLedger) {
    const resolvedAmount = amount === 0 ? new Prisma.Decimal(0) : normalizedAmount;
    const resolvedDescription = amount === 0 ? `${normalizedDescription} (cleared)` : normalizedDescription;

    await tx.ledgerEntry.update({
      where: { id: existingLedger.id },
      data: {
        partyId,
        entryType: 'OPENING_BALANCE',
        amount: resolvedAmount,
        runningBalance: resolvedAmount,
        description: resolvedDescription,
        referenceNumber: null,
        createdById,
        entryDate: new Date()
      }
    });

    return;
  }

  if (amount === 0) {
    return;
  }

  await tx.ledgerEntry.create({
    data: {
      partyId,
      entryType: 'OPENING_BALANCE',
      amount: normalizedAmount,
      runningBalance: normalizedAmount,
      description: normalizedDescription,
      referenceNumber: null,
      createdById
    }
  });

}

export async function createOrUpdateParty(formData: FormData) {
  const session = await requireUser();

  const rawData = Object.fromEntries(formData.entries());
  const parsed = partySchema.safeParse(rawData);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? 'Invalid data provided.' };
  }

  const { id, existingImageUrl, openingBalanceAmount, openingBalanceType, openingBalanceDescription, ...data } = parsed.data;
  const imageFile = formData.get('image') as File | null;
  const normalizedOpeningBalance = normalizeOpeningBalanceValue(
    Number(openingBalanceAmount ?? data.openingBalance ?? 0),
    openingBalanceType
  );

  try {
    const party = await prisma.$transaction(async (tx) => {
      const savedParty = await tx.party.upsert({
        where: { id: id ?? -1 },
        create: {
          ...data,
          openingBalance: normalizedOpeningBalance,
          openingBalanceType,
          openingBalanceDescription: openingBalanceDescription?.trim() || null,
          imageUrl: null
        },
        update: {
          ...data,
          openingBalance: normalizedOpeningBalance,
          openingBalanceType,
          openingBalanceDescription: openingBalanceDescription?.trim() || null
        }
      });

      if (!session.user.id) {
        throw new Error('Authenticated user is required to store an opening balance.');
      }

      await syncOpeningBalanceLedger({
        tx,
        partyId: savedParty.id,
        amount: normalizedOpeningBalance,
        description: openingBalanceDescription,
        createdById: session.user.id
      });

      return savedParty;
    });

    let newImageUrl = existingImageUrl || party.imageUrl;

    if (imageFile && imageFile.size > 0) {
      await deleteOldImage(existingImageUrl);
      newImageUrl = await uploadPartyImage(party.id, imageFile);
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
  partyId: z.coerce.number().int().positive()
});

export async function deleteParty(formData: FormData) {
  await requireUser();
  const parsed = deletePartySchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { success: false, message: 'Invalid party ID.' };
  }

  const { partyId } = parsed.data;

  try {
    const deletedParty = await prisma.$transaction(async (tx) => {
      const party = await tx.party.findUnique({
        where: { id: partyId },
        select: { id: true, name: true, imageUrl: true }
      });

      if (!party) {
        throw new Error('Party not found.');
      }

      const transactions = await tx.transaction.findMany({
        where: { partyId },
        select: {
          id: true,
          companyId: true,
          stockMovements: {
            select: { productId: true, movementType: true, quantity: true }
          }
        }
      });
      const transactionIds = transactions.map((transaction) => transaction.id);
      const partyPayments = await tx.payment.findMany({
        where: { partyId },
        select: {
          id: true,
          companyId: true,
          allocations: {
            select: {
              transactionId: true,
              transaction: { select: { partyId: true } }
            }
          }
        }
      });
      const transactionAllocations = transactionIds.length > 0
        ? await tx.paymentAllocation.findMany({
          where: { transactionId: { in: transactionIds } },
          select: {
            paymentId: true,
            transactionId: true,
            payment: { select: { partyId: true } }
          }
        })
        : [];

      if (
        partyPayments.some((payment) =>
          payment.allocations.some((allocation) => allocation.transaction.partyId !== partyId)
        ) ||
        transactionAllocations.some((allocation) => {
          return allocation.payment.partyId !== partyId;
        })
      ) {
        throw new Error('This party has a payment shared with another party. Update its payment allocation before deleting this party.');
      }

      const paymentIds = [...new Set([
        ...partyPayments.map((payment) => payment.id),
        ...transactionAllocations.map((allocation) => allocation.paymentId)
      ])];
      const ledgerEntries = await tx.ledgerEntry.findMany({
        where: {
          OR: [
            { partyId },
            ...(transactionIds.length > 0 ? [{ transactionId: { in: transactionIds } }] : []),
            ...(paymentIds.length > 0 ? [{ paymentId: { in: paymentIds } }] : [])
          ]
        },
        select: { companyId: true }
      });
      const companyIds = [...new Set([
        ...transactions.map((transaction) => transaction.companyId),
        ...partyPayments.map((payment) => payment.companyId),
        ...ledgerEntries.map((entry) => entry.companyId)
      ].filter((id): id is number => id !== null))];

      const stockChanges = new Map<number, Prisma.Decimal>();
      const purchasedProductIds = new Set<number>();
      let stockAdjustmentWasLimited = false;
      for (const transaction of transactions) {
        for (const movement of transaction.stockMovements) {
          const quantity = new Prisma.Decimal(movement.quantity);
          if (movement.movementType === 'SALE') {
            stockChanges.set(movement.productId, (stockChanges.get(movement.productId) ?? new Prisma.Decimal(0)).plus(quantity));
          } else if (movement.movementType === 'PURCHASE') {
            stockChanges.set(movement.productId, (stockChanges.get(movement.productId) ?? new Prisma.Decimal(0)).minus(quantity));
            purchasedProductIds.add(movement.productId);
          } else {
            throw new Error('This party has an unsupported stock movement. Resolve it before deleting the party.');
          }
        }
      }

      for (const [productId, change] of stockChanges) {
        const balance = await tx.stockBalance.findUnique({ where: { productId } });
        let nextQuantity = new Prisma.Decimal(balance?.quantityOnHand ?? 0).plus(change);
        if (nextQuantity.lt(0)) {
          nextQuantity = new Prisma.Decimal(0);
          stockAdjustmentWasLimited = true;
        }

        if (balance) {
          await tx.stockBalance.update({
            where: { productId },
            data: {
              quantityOnHand: nextQuantity,
              ...(nextQuantity.isZero() ? { averageCost: null } : {})
            }
          });
        } else if (nextQuantity.gt(0)) {
          await tx.stockBalance.create({
            data: {
              productId,
              quantityOnHand: nextQuantity,
              reservedQuantity: new Prisma.Decimal(0),
              averageCost: null
            }
          });
        }
      }

      for (const productId of purchasedProductIds) {
        const remainingPurchases = await tx.stockMovement.findMany({
          where: {
            productId,
            movementType: 'PURCHASE',
            ...(transactionIds.length > 0 ? { transactionId: { notIn: transactionIds } } : {}),
            transaction: { status: { not: 'CANCELLED' } }
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: { quantity: true, unitCost: true }
        });
        const purchasedQuantity = remainingPurchases.reduce(
          (sum, movement) => sum.plus(movement.quantity),
          new Prisma.Decimal(0)
        );
        const purchaseValue = remainingPurchases.reduce(
          (sum, movement) => sum.plus(new Prisma.Decimal(movement.quantity).times(movement.unitCost ?? 0)),
          new Prisma.Decimal(0)
        );
        const balance = await tx.stockBalance.findUnique({ where: { productId } });

        await tx.product.update({
          where: { id: productId },
          data: { defaultPurchasePrice: remainingPurchases[0]?.unitCost ?? null }
        });
        if (balance && new Prisma.Decimal(balance.quantityOnHand).gt(0)) {
          await tx.stockBalance.update({
            where: { productId },
            data: { averageCost: purchasedQuantity.gt(0) ? purchaseValue.div(purchasedQuantity) : null }
          });
        }
      }

      await tx.smsNotification.deleteMany({
        where: {
          OR: [
            { partyId },
            ...(transactionIds.length > 0 ? [{ transactionId: { in: transactionIds } }] : [])
          ]
        }
      });
      await tx.ledgerEntry.deleteMany({
        where: {
          OR: [
            { partyId },
            ...(transactionIds.length > 0 ? [{ transactionId: { in: transactionIds } }] : []),
            ...(paymentIds.length > 0 ? [{ paymentId: { in: paymentIds } }] : [])
          ]
        }
      });
      await tx.dueAdjustment.deleteMany({
        where: {
          OR: [
            { partyId },
            ...(transactionIds.length > 0 ? [{ transactionId: { in: transactionIds } }] : [])
          ]
        }
      });
      await tx.stockMovement.deleteMany({ where: { transactionId: { in: transactionIds } } });
      await tx.transactionItem.deleteMany({ where: { transactionId: { in: transactionIds } } });
      await tx.paymentAllocation.deleteMany({
        where: {
          OR: [
            { paymentId: { in: paymentIds } },
            { transactionId: { in: transactionIds } }
          ]
        }
      });
      if (paymentIds.length > 0) {
        await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
      }
      await tx.transaction.deleteMany({ where: { id: { in: transactionIds } } });
      await tx.party.delete({ where: { id: partyId } });

      for (const companyId of companyIds) {
        await rebuildLedgerRunningBalancesForAccount(tx, { companyId });
      }

      return { name: party.name, imageUrl: party.imageUrl, companyIds, stockAdjustmentWasLimited };
    }, { maxWait: 10_000, timeout: 30_000 });

    await deleteOldImage(deletedParty.imageUrl);
    revalidateInventoryData({ companyIds: deletedParty.companyIds, partyIds: [partyId] });

    const stockNote = deletedParty.stockAdjustmentWasLimited
      ? ' Some purchased stock had already been used, so the affected stock balance was set to zero instead of going negative.'
      : '';
    return {
      success: true,
      message: `Party '${deletedParty.name}' and all related data have been permanently deleted.${stockNote}`
    };
  } catch (error) {
    console.error('Error deleting party:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete party.' };
  }
}

export async function getPartyAccountSummary(partyId: number) {
  await requireUser();
  const summary = await getPartyFinancialSummary(partyId);
  return {
    ...summary,
    customerInvoiced: summary.customerSales,
    customerPaid: summary.customerPayments,
    supplierInvoiced: summary.supplierPurchases,
    supplierPaid: summary.supplierPayments,
    supplierDue: summary.supplierPayable,
    netCustomerDue: summary.customerDue,
    netSupplierDue: summary.supplierPayable,
    offsetApplied: summary.usedOpeningAdvance,
    currentBalance: summary.customerDue
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
  const take = DEFAULT_PAGE_SIZE;
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
        openingBalanceType: true,
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
        Array<{ partyId: number; paymentDirection: string | null; totalPaid: any }>,
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
            AND "status" <> 'CANCELLED'
          GROUP BY "partyId", "transactionType"
        `,
        prisma.$queryRaw<Array<{ partyId: number; paymentDirection: string | null; totalPaid: any }>>`
          SELECT p."partyId", p."paymentDirection", COALESCE(SUM(p."amount"), 0) AS "totalPaid"
          FROM "Payment" p
          WHERE p."partyId" IN (${Prisma.join(partyIds)})
            AND p."status" <> 'CANCELLED'
            AND NOT EXISTS (
              SELECT 1 FROM "PaymentAllocation" pa WHERE pa."paymentId" = p."id"
            )
          GROUP BY p."partyId", p."paymentDirection"
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
    const rows = paymentMap.get(row.partyId) ?? [];
    rows.push({
      amount: row.totalPaid ?? 0,
      paymentDate: new Date(),
      allocations: [],
      paymentDirection: row.paymentDirection
    });
    paymentMap.set(row.partyId, rows);
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
      ...summarizePartyAccount(
        party.partyType,
        transactions,
        payments,
        Number(party.openingBalance ?? 0),
        party.openingBalanceType
      )
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

export async function getPartyStats(args: { search?: string; partyType?: string; status?: string; period?: 'all' | 'month' }) {
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

  if (args.period === 'month') {
    const now = new Date();
    filters.push({ createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } });
  }

  const where: PartyWhereInput = filters.length > 0 ? { AND: filters } : {};

  const rows = await prisma.party.groupBy({
    by: ['isActive', 'partyType'],
    where,
    _count: { _all: true }
  });

  const total = rows.reduce((sum, row) => sum + row._count._all, 0);
  const activeParties = rows.reduce((sum, row) => sum + (row.isActive ? row._count._all : 0), 0);
  const customers = rows.reduce((sum, row) => sum + (row.partyType === 'CUSTOMER' || row.partyType === 'BOTH' ? row._count._all : 0), 0);
  const suppliers = rows.reduce((sum, row) => sum + (row.partyType === 'PARTY' || row.partyType === 'BOTH' ? row._count._all : 0), 0);

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
  const summary = await getPartyFinancialSummary(partyId);
  return new Prisma.Decimal(summary.customerDue).toNumber();
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

  if (party.partyType === 'CUSTOMER') {
    return 0;
  }

  const summary = await getPartyFinancialSummary(partyId);
  return new Prisma.Decimal(summary.supplierPayable).toNumber();
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
    const partyDetails = await prisma.party.findUnique({ where: { id: partyId }, select: { id: true, name: true, phone: true } });

    if (partyDetails) {
      await queueTransactionSmsNotification({
        partyId: partyDetails.id,
        transactionId: null,
        phoneNumber: partyDetails.phone,
        partyName: partyDetails.name,
        message: createPaymentReceivedSmsMessage({
          partyName: partyDetails.name,
          amount: new Prisma.Decimal(amount.toString()).toFixed(2),
          referenceNumber
        }),
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
        paymentDirection: 'CUSTOMER_PAYMENT',
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
        message: createPaymentReceivedSmsMessage({
          partyName: partyDetails.name,
          amount: new Prisma.Decimal(amount.toString()).toFixed(2),
          remainingDue: newBalance.gt(0) ? newBalance.toFixed(2) : undefined,
          referenceNumber
        }),
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

  if (amount > currentPayable && formData.get('enforcePayableCap') === 'true') {
    return { success: false, message: `Payment amount cannot exceed current supplier payable of ৳${currentPayable.toFixed(2)}.` };
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        partyId,
        paymentDate,
        paymentMethod,
        amount: new Prisma.Decimal(amount),
        paymentDirection: 'SUPPLIER_PAYMENT',
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
        message: createPaymentPaidSmsMessage({
          partyName: partyDetails.name,
          amount: new Prisma.Decimal(amount.toString()).toFixed(2),
          remainingDue: newBalance.gt(0) ? newBalance.toFixed(2) : undefined,
          referenceNumber
        }),
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

    await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, amount: true, partyId: true }
      });

      if (!existingPayment) {
        throw new Error('Payment not found.');
      }

      const previousAmount = new Prisma.Decimal(existingPayment.amount.toString());
      const newAmount = new Prisma.Decimal(amount);
      const allocations = await tx.paymentAllocation.findMany({
        where: { paymentId },
        select: { id: true, transactionId: true, amount: true }
      });

      if (allocations.length > 1 && !newAmount.equals(previousAmount)) {
        throw new Error('Cannot change payment amount for payments allocated across multiple transactions. Remove allocation(s) before updating the amount.');
      }

      if (allocations.length === 1 && !newAmount.equals(previousAmount)) {
        const allocation = allocations[0];
        const transaction = await tx.transaction.findUnique({
          where: { id: allocation.transactionId },
          select: { id: true, totalAmount: true, paidAmount: true }
        });

        if (!transaction) {
          throw new Error('Allocated transaction not found.');
        }

        const allocationDelta = newAmount.minus(previousAmount);
        const nextPaid = new Prisma.Decimal(transaction.paidAmount.toString()).plus(allocationDelta);
        const nextDue = new Prisma.Decimal(transaction.totalAmount.toString()).minus(nextPaid);

        await tx.paymentAllocation.update({
          where: { id: allocation.id },
          data: { amount: new Prisma.Decimal(allocation.amount).plus(allocationDelta) }
        });

        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            paidAmount: nextPaid,
            dueAmount: nextDue,
            status: nextDue.gt(0) ? 'PENDING' : 'COMPLETED'
          }
        });
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: paymentData
      });

      const latestPaymentLedger = await tx.ledgerEntry.findFirst({
        where: { paymentId, entryType: { in: ['PAYMENT_RECEIVED', 'PAYMENT_PAID'] } },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
      });

      if (latestPaymentLedger) {
        await tx.ledgerEntry.create({
          data: {
            partyId: latestPaymentLedger.partyId,
            companyId: latestPaymentLedger.companyId,
            transactionId: latestPaymentLedger.transactionId,
            entryDate: new Date(),
            entryType: 'PAYMENT_REVERSAL',
            amount: new Prisma.Decimal(latestPaymentLedger.amount.toString()).negated(),
            runningBalance: new Prisma.Decimal(0),
            description: `Reversal of edited payment ${latestPaymentLedger.referenceNumber ?? paymentId}`,
            referenceNumber: latestPaymentLedger.referenceNumber
          }
        });

        if (status !== 'CANCELLED') {
          await tx.ledgerEntry.create({
            data: {
              partyId: latestPaymentLedger.partyId,
              companyId: latestPaymentLedger.companyId,
              transactionId: latestPaymentLedger.transactionId,
              paymentId,
              entryDate: paymentDate ?? new Date(),
              entryType: latestPaymentLedger.entryType,
              amount: newAmount.negated(),
              runningBalance: new Prisma.Decimal(0),
              description: latestPaymentLedger.description,
              referenceNumber: referenceNumber || latestPaymentLedger.referenceNumber
            }
          });
        }

        await rebuildLedgerRunningBalancesForAccount(tx, { partyId: existingPayment.partyId });
      }
    });

    revalidatePartyData(partyId);
    return { success: true, message: 'Payment updated successfully.' };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to update payment.' };
  }
}

export async function deletePaymentForParty(formData: FormData) {
  await requireUser();
  const paymentId = Number(formData.get('paymentId'));
  const partyId = Number(formData.get('partyId'));

  if (!paymentId || !partyId) {
    return { success: false, message: 'Invalid ID for deletion.' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const allocations = await tx.paymentAllocation.findMany({
        where: { paymentId },
        select: { transactionId: true, amount: true }
      });

      for (const allocation of allocations) {
        const transaction = await tx.transaction.findUnique({
          where: { id: allocation.transactionId },
          select: { id: true, totalAmount: true, paidAmount: true, dueAmount: true }
        });

        if (!transaction) {
          continue;
        }

        const previousPaid = new Prisma.Decimal(transaction.paidAmount.toString());
        const allocationAmount = new Prisma.Decimal(allocation.amount.toString());
        const nextPaid = previousPaid.minus(allocationAmount);
        const nextDue = new Prisma.Decimal(transaction.totalAmount.toString()).minus(nextPaid);

        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            paidAmount: nextPaid,
            dueAmount: nextDue,
            status: nextDue.gt(0) ? 'PENDING' : 'COMPLETED'
          }
        });
      }

      // Create reversal ledger entry for the payment to preserve audit trail
      const paymentLedger = await tx.ledgerEntry.findFirst({
        where: { paymentId },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
      });

      if (paymentLedger) {
        const reversalAmount = new Prisma.Decimal(paymentLedger.amount.toString()).negated();
        await tx.ledgerEntry.create({
          data: {
            partyId: paymentLedger.partyId,
            companyId: paymentLedger.companyId,
            transactionId: paymentLedger.transactionId,
            paymentId: null,
            entryDate: new Date(),
            entryType: 'PAYMENT_REVERSAL',
            amount: reversalAmount,
            runningBalance: new Prisma.Decimal(0),
            description: `Reversal of payment ${paymentLedger.referenceNumber}`,
            referenceNumber: paymentLedger.referenceNumber
          }
        });
      }

      await tx.paymentAllocation.deleteMany({ where: { paymentId } });
      await tx.payment.delete({ where: { id: paymentId } });

      await rebuildLedgerRunningBalancesForAccount(tx, { partyId });
    });

    revalidatePartyData(partyId);
    return { success: true, message: 'Payment deleted successfully.' };
  } catch (error) {
    console.error('Error deleting payment:', error);
    return { success: false, message: 'Failed to delete payment.' };
  }
}

const supplierPurchaseSchema = z.object({
  partyId: z.coerce.number({ required_error: 'Supplier is required.' }),
  purchaseDate: z.preprocess((value) => value || new Date(), z.coerce.date()),
  productCategory: z.enum(['EGG', 'CHICKEN'], { required_error: 'Product category is required.' }),
  productName: z.string().min(1, 'Product name is required.'),
  quantity: z.coerce.number().min(0.0001, 'Quantity must be greater than zero.'),
  chickenQuantity: z.coerce.number().min(0).default(0),
  unit: z.string().min(1, 'Unit is required.'),
  unitPrice: z.coerce.number().min(0.01, 'Unit price must be greater than zero.'),
  totalAmount: z.coerce.number().min(0.01, 'Total amount must be greater than zero.'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative.').default(0),
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

  const { partyId, purchaseDate, productCategory, productName, quantity, chickenQuantity, unit, unitPrice, totalAmount, discount, paidAmount, paymentMethod, referenceNumber, notes } = parsed.data;

  // Server-side validation: For Chicken products, verify line total is calculated using totalKg (chickenQuantity), not quantity
  if (productCategory === 'CHICKEN') {
    if (chickenQuantity <= 0) {
      return { success: false, message: 'Chicken total KG must be greater than zero.' };
    }
    // Verify the line total calculation: unitPrice × totalKg (not quantity × unitPrice)
    const expectedGrossAmount = new Prisma.Decimal(unitPrice).times(new Prisma.Decimal(chickenQuantity));
    const expectedNetAmount = expectedGrossAmount.minus(new Prisma.Decimal(discount));
    const tolerance = new Prisma.Decimal('0.01'); // Allow for small rounding differences
    const receivedAmount = new Prisma.Decimal(totalAmount);
    
    if (receivedAmount.minus(expectedNetAmount).abs().gt(tolerance)) {
      console.warn('[createSupplierPurchase] Chicken line total mismatch', {
        received: receivedAmount.toString(),
        expected: expectedNetAmount.toString(),
        unitPrice: unitPrice.toString(),
        totalKg: chickenQuantity.toString(),
        quantity,
        discount: discount.toString()
      });
      return { success: false, message: `Chicken line total calculation error. Expected: ৳${expectedNetAmount.toFixed(2)}, Received: ৳${receivedAmount.toFixed(2)}` };
    }
  }

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

  const dueAmount = new Prisma.Decimal(totalAmount).minus(new Prisma.Decimal(paidAmount));
  const status = dueAmount.gt(0) ? 'PENDING' : 'COMPLETED';

  try {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await prisma.$transaction(async (tx) => {
      const invoiceNumber = await getInvoiceNumber(tx);
      let productId: number | undefined;

      const normalizedUnit = unit.trim();
      const existingProduct = await tx.product.findFirst({
        where: {
          name: productName.trim(),
          productType: productCategory,
          unit: normalizedUnit
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

      const grossAmount = new Prisma.Decimal(totalAmount).plus(new Prisma.Decimal(discount));
      const netAmount = new Prisma.Decimal(totalAmount);

      const transactionItemData = {
        productId: productId,
        quantity: new Prisma.Decimal(quantity),
        unitPrice: new Prisma.Decimal(unitPrice),
        // Keep line totals gross; the invoice discount is stored once on the
        // transaction and must not be applied a second time by reports.
        lineTotal: grossAmount,
        taxAmount: new Prisma.Decimal(0),
        description: `${productCategory} - ${productName} (${quantity} ${unit})`,
        ...((productCategory === 'CHICKEN') && chickenQuantity > 0 ? {
          chickenQuantity: new Prisma.Decimal(chickenQuantity)
        } : {})
      };

      const purchase = await tx.transaction.create({
        data: {
          transactionType: 'PURCHASE',
          partyId,
          transactionDate: purchaseDate,
          invoiceNumber,
          status,
          subtotal: grossAmount,
          discount: new Prisma.Decimal(discount),
          tax: new Prisma.Decimal(0),
          totalAmount: netAmount,
          paidAmount: new Prisma.Decimal(paidAmount),
          dueAmount: new Prisma.Decimal(dueAmount),
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          transactionItems: {
            create: transactionItemData
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
            paymentDirection: 'SUPPLIER_PAYMENT',
            referenceNumber: referenceNumber || null,
            status: paidAmount < totalAmount ? 'PARTIAL' : 'COMPLETED',
            notes: notes || null
          }
        });

        await tx.paymentAllocation.create({
          data: {
            paymentId: paymentRecord.id,
            transactionId: purchase.id,
            amount: new Prisma.Decimal(paidAmount)
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
    }, { timeout: 15000 });

    revalidatePurchaseData({ partyId });
    return { success: true, message: 'Supplier purchase recorded successfully.' };
  } catch (error) {
    lastError = error instanceof Error ? error : new Error('Failed to record supplier purchase.');
    if (!isUniqueConstraintError(error)) {
      throw lastError;
    }
  }
}

    return { success: false, message: lastError?.message ?? 'Failed to record supplier purchase after multiple attempts.' };
  } catch (error) {
    console.error('Error recording supplier purchase:', error);
    return { success: false, message: 'Failed to record supplier purchase.' };
  }
}
