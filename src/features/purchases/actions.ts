'use server';

import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { CACHE_TAGS, revalidatePurchaseData } from '@/lib/cache';
import { getInvoiceNumber, isUniqueConstraintError } from '@/lib/invoice';
import { queueTransactionSmsNotification } from '@/lib/sms/service';
import { DEFAULT_PAGE_SIZE } from '@/config/pagination';

const PURCHASE_TRANSACTION_TYPE = 'PURCHASE' as const;
const PENDING_TRANSACTION_STATUS = 'PENDING' as const;
const COMPLETED_TRANSACTION_STATUS = 'COMPLETED' as const;
const PURCHASE_LEDGER_ENTRY_TYPE = 'PURCHASE' as const;
const PAYMENT_PAID_LEDGER_ENTRY_TYPE = 'PAYMENT_PAID' as const;
const PARTIAL_PAYMENT_STATUS = 'PARTIAL' as const;
const COMPLETED_PAYMENT_STATUS = 'COMPLETED' as const;
const PURCHASE_STOCK_MOVEMENT_TYPE = 'PURCHASE' as const;

const FEED_MEDICINE_TYPES = ['FEED', 'MEDICINE', 'CHICK'] as const;
const POULTRY_TYPES = ['EGG', 'CHICKEN'] as const;

function getSupplierTypeFromItems(items: Array<{ productType: string }>): 'company' | 'party' {
  const productTypes = new Set(items.map((item) => item.productType));
  const hasFeedMedicine = [...productTypes].some((t) => FEED_MEDICINE_TYPES.includes(t as typeof FEED_MEDICINE_TYPES[number]));
  const hasPoultry = [...productTypes].some((t) => POULTRY_TYPES.includes(t as typeof POULTRY_TYPES[number]));

  if (hasFeedMedicine && hasPoultry) {
    throw new Error('Cannot mix feed/medicine with poultry in the same purchase.');
  }

  if (hasFeedMedicine) return 'company';
  return 'party';
}

function getCompanyTypeForProductTypes(productTypes: Set<string>): 'FEED' | 'MEDICINE' | 'CHICK' | 'FEED_CHICK' {
  const hasFeed = productTypes.has('FEED');
  const hasMedicine = productTypes.has('MEDICINE');
  const hasChick = productTypes.has('CHICK');

  if (hasFeed && hasChick && !hasMedicine) return 'FEED_CHICK';
  if (hasFeed && hasMedicine && hasChick) return 'FEED_CHICK';
  if (hasFeed && hasMedicine) return 'FEED';
  if (hasFeed) return 'FEED';
  if (hasMedicine) return 'MEDICINE';
  if (hasChick) return 'CHICK';
  return 'FEED';
}

function isProductTypeAllowedForCompanyType(productType: string, companyType: string): boolean {
  switch (companyType) {
    case 'FEED':
      // Feed suppliers may also provide hatchlings/chicks in this purchase flow.
      return productType === 'FEED' || productType === 'CHICK';
    case 'MEDICINE':
      return productType === 'MEDICINE';
    case 'CHICK':
      return productType === 'CHICK';
    case 'FEED_CHICK':
      return productType === 'FEED' || productType === 'CHICK';
    default:
      return false;
  }
}

const purchaseItemSchema = z.object({
  productId: z.preprocess((val) => {
    if (!val || val === '' || val === null || val === undefined) return undefined;
    return Number(val);
  }, z.number().int().positive('Please select a valid product.').optional()),
  productName: z.string().trim().optional().or(z.literal('')),
  productType: z.enum(['FEED', 'MEDICINE', 'EGG', 'CHICKEN', 'CHICK']).optional().default('FEED'),
  quantity: z.coerce.number().min(0.0001, 'Quantity must be greater than zero.'),
  unitPrice: z.coerce.number().min(0, 'Rate cannot be negative.'),
  buyRate: z.coerce.number().min(0, 'Buy rate cannot be negative.').optional().default(0),
  description: z.string().trim().max(250).optional().or(z.literal('')),
  unit: z.string().trim().max(20).optional().or(z.literal(''))
}).refine((data) => data.productId || data.productName, {
  message: 'Product name is required.',
  path: ['productName']
});

const purchaseSchema = z.object({
  partyId: z.string().optional(),
  companyId: z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return undefined;
      const parsed = Number(trimmed);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : value;
    }
    return value;
  }, z.number().int().positive('Selected company is invalid.').optional()),
  newPartyName: z.string().trim().optional(),
  newCompanyName: z.string().trim().optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'OTHER']),
  paymentAmount: z.coerce.number().min(0, 'Payment amount cannot be negative.').optional().default(0),
  discount: z.coerce.number().min(0, 'Discount cannot be negative.').optional().default(0),
  referenceNumber: z.string().trim().max(100).optional().or(z.literal('')),
  transactionDate: z.string().trim().optional().or(z.literal('')).transform((value) => value ? new Date(value) : undefined),
  dueDate: z.string().trim().optional().or(z.literal('')).transform((value) => value ? new Date(value) : undefined),
  notes: z.string().trim().max(250).optional().or(z.literal('')),
  redirectPath: z.string().trim().optional().default('/dashboard/purchases'),
  items: z.array(purchaseItemSchema).min(1, 'Add at least one purchase item.')
});

function normalizePurchaseInput(formData: FormData) {
  const productIds = formData.getAll('productId').map((value) => value?.toString() ?? '');
  const productNames = formData.getAll('productName').map((value) => value?.toString() ?? '');
  const productTypes = formData.getAll('productType').map((value) => value?.toString() ?? 'FEED');
  const quantities = formData.getAll('quantity').map((value) => value?.toString() ?? '0');
  const units = formData.getAll('unit').map((value) => value?.toString() ?? '');
  const buyRates = formData.getAll('buyRate').map((value) => value?.toString() ?? '0');
  const unitPrices = formData.getAll('unitPrice').map((value) => value?.toString() ?? '0');
  const descriptions = formData.getAll('description').map((value) => value?.toString() ?? '');

  const items = productIds.map((productId, index) => ({
    productId,
    productName: productNames[index] ?? '',
    productType: productTypes[index] ?? 'FEED',
    quantity: quantities[index] ?? '0',
    unitPrice: unitPrices[index] ?? buyRates[index] ?? '0',
    buyRate: buyRates[index] ?? '0',
    description: descriptions[index] ?? '',
    unit: units[index] ?? ''
  })).filter((item) => (item.productId.trim() || item.productName.trim()) && Number(item.quantity) > 0);

  return {
    partyId: formData.get('partyId')?.toString() ?? '',
    companyId: formData.get('companyId')?.toString() ?? '',
    newPartyName: formData.get('newPartyName')?.toString() ?? '',
    newCompanyName: formData.get('newCompanyName')?.toString() ?? '',
    paymentMethod: formData.get('paymentMethod')?.toString() ?? 'CASH',
    paymentAmount: formData.get('paymentAmount')?.toString() ?? '0',
    discount: formData.get('discount')?.toString() ?? '0',
    referenceNumber: formData.get('referenceNumber')?.toString() ?? '',
    transactionDate: formData.get('transactionDate')?.toString() ?? '',
    dueDate: formData.get('dueDate')?.toString() ?? '',
    notes: formData.get('notes')?.toString() ?? '',
    redirectPath: formData.get('redirectPath')?.toString() ?? '/dashboard/purchases',
    items
  };
}

export type PurchaseActionResult =
  | { success: true; message: string; transactionId: number }
  | { success: false; message: string };

async function createPurchaseTransactionInternal(formData: FormData): Promise<PurchaseActionResult> {
  await requireUser();

  const parsed = purchaseSchema.safeParse(normalizePurchaseInput(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Purchase validation failed.';
    return { success: false, message };
  }

  const data = parsed.data;
  const redirectPath = data.redirectPath || '/dashboard/purchases';
  const items = data.items;

  let supplierType: 'company' | 'party';
  try {
    supplierType = getSupplierTypeFromItems(items);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Invalid purchase.' };
  }

  type PurchaseTransactionResult = {
    purchaseId: number;
    supplier: { id: number; name: string; phone: string | null } | null;
  };

  if (supplierType === 'company') {
    if (!data.companyId && !data.newCompanyName) {
      return { success: false, message: 'Company supplier is required. Select an existing company or type a new one.' };
    }
  } else {
    if (!data.partyId && !data.newPartyName) {
      return { success: false, message: 'Party supplier is required. Select an existing party or type a new one.' };
    }
  }

  const subtotal = items.reduce((sum, item) => {
    return sum.plus(new Prisma.Decimal(item.quantity).times(new Prisma.Decimal(item.unitPrice)));
  }, new Prisma.Decimal(0));
  const totalAmount = subtotal.minus(new Prisma.Decimal(data.discount));

  if (totalAmount.lt(0)) {
    return { success: false, message: 'Total amount cannot be negative.' };
  }

  if (new Prisma.Decimal(data.paymentAmount).gt(totalAmount)) {
    return { success: false, message: 'Payment amount cannot be greater than total amount.' };
  }

  try {
    const dueAmount = totalAmount.minus(new Prisma.Decimal(data.paymentAmount));
    const status = dueAmount.gt(0) ? PENDING_TRANSACTION_STATUS : COMPLETED_TRANSACTION_STATUS;

    let lastError: Error | null = null;
    let purchaseResult: PurchaseTransactionResult | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const invoiceNumber = getInvoiceNumber('PUR');
      try {
        purchaseResult = await prisma.$transaction(async (tx) => {
          const resolvedItems: Array<typeof items[number] & { productId: number }> = [];

          for (const item of items) {
            let productId = item.productId;

            if (!productId && item.productName && item.productName.trim()) {
              const normalizedUnit = item.unit?.trim() || 'pcs';
              const existingProduct = await tx.product.findFirst({
                where: {
                  name: item.productName.trim(),
                  productType: item.productType || 'FEED',
                  unit: normalizedUnit
                }
              });

              if (existingProduct) {
                productId = existingProduct.id;
              } else {
                const existingCount = await tx.product.count({
                  where: { productType: item.productType || 'FEED' }
                });
                const newProduct = await tx.product.create({
                  data: {
                    code: `${item.productType || 'FEED'}-${String(existingCount + 1).padStart(3, '0')}`,
                    name: item.productName.trim(),
                    productType: item.productType || 'FEED',
                    unit: item.unit || 'pcs',
                    isActive: true
                  }
                });
                productId = newProduct.id;
              }
            }

            resolvedItems.push({
              ...item,
              productId: productId ?? 0
            });
          }

      let companyIdToUse: number | undefined;
      let partyIdToUse: number | undefined;

      if (supplierType === 'company') {
        const companyId = data.companyId;

        if (companyId) {
          const company = await tx.company.findUnique({
            where: { id: companyId },
            select: { companyType: true }
          });

          if (!company) {
            throw new Error('Selected company does not exist. Please select a valid company.');
          }

          const invalidItem = items.find((item) => !isProductTypeAllowedForCompanyType(item.productType, company.companyType));
          if (invalidItem) {
            throw new Error(`Company type "${company.companyType}" does not allow purchasing product type "${invalidItem.productType}".`);
          }

          companyIdToUse = companyId;
        } else if (data.newCompanyName) {
          const normalizedName = data.newCompanyName.trim();
          const existingCompany = await tx.company.findFirst({
            where: {
              name: {
                equals: normalizedName,
                mode: 'insensitive'
              }
            }
          });
          if (existingCompany) {
            companyIdToUse = existingCompany.id;
          } else {
            const productTypes = new Set(items.map((item) => item.productType));
            const companyType = getCompanyTypeForProductTypes(productTypes);
            const newCompany = await tx.company.create({
              data: {
                name: normalizedName,
                companyType,
                isActive: true
              }
            });
            companyIdToUse = newCompany.id;
          }
        }
      } else {
        let partyId = data.partyId ? Number(data.partyId) : undefined;
        if (!partyId && data.newPartyName) {
          const newParty = await tx.party.create({ data: { name: data.newPartyName, partyType: 'PARTY', isActive: true, phone: '' } });
          partyId = newParty.id;
        }
        partyIdToUse = partyId;
      }

      const purchase = await tx.transaction.create({
        data: {
          transactionType: PURCHASE_TRANSACTION_TYPE,
          partyId: partyIdToUse ?? null,
          companyId: companyIdToUse ?? null,
          transactionDate: data.transactionDate ?? new Date(),
          invoiceNumber,
          status,
          subtotal: new Prisma.Decimal(subtotal),
          discount: new Prisma.Decimal(data.discount),
          tax: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(data.paymentAmount),
          dueAmount: new Prisma.Decimal(dueAmount),
          dueDate: data.dueDate ?? null,
          referenceNumber: data.referenceNumber || null,
          notes: data.notes || null,
          transactionItems: {
            createMany: {
              data: resolvedItems.map((item) => ({
                productId: item.productId,
                quantity: new Prisma.Decimal(item.quantity),
                unitPrice: new Prisma.Decimal(item.unitPrice),
                lineTotal: new Prisma.Decimal(item.quantity).times(new Prisma.Decimal(item.unitPrice)),
                taxAmount: new Prisma.Decimal(0),
                description: item.description || (item.unit ? `Unit: ${item.unit}` : null)
              }))
            }
          }
        }
      });

      if (supplierType === 'company') {
        const lastLedger = await tx.ledgerEntry.findFirst({
          where: { companyId: companyIdToUse },
          orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
        });
        const previousBalance = new Prisma.Decimal(lastLedger?.runningBalance ?? 0);
        const purchaseBalance = previousBalance.plus(new Prisma.Decimal(totalAmount));

        await tx.ledgerEntry.create({
          data: {
            companyId: companyIdToUse,
            transactionId: purchase.id,
            entryType: PURCHASE_LEDGER_ENTRY_TYPE,
            amount: new Prisma.Decimal(totalAmount),
            runningBalance: purchaseBalance,
            description: `Purchase invoice ${invoiceNumber}`,
            referenceNumber: invoiceNumber
          }
        });

        if (data.paymentAmount > 0) {
          const paymentRecord = await tx.payment.create({
            data: {
              companyId: companyIdToUse,
              paymentMethod: data.paymentMethod,
              amount: new Prisma.Decimal(data.paymentAmount),
              referenceNumber: data.referenceNumber || null,
              status: new Prisma.Decimal(data.paymentAmount).lt(totalAmount) ? PARTIAL_PAYMENT_STATUS : COMPLETED_PAYMENT_STATUS,
              notes: data.notes || null
            }
          });

          await tx.paymentAllocation.create({
            data: {
              paymentId: paymentRecord.id,
              transactionId: purchase.id,
              amount: new Prisma.Decimal(data.paymentAmount)
            }
          });

          await tx.ledgerEntry.create({
            data: {
              companyId: companyIdToUse,
              transactionId: purchase.id,
              paymentId: paymentRecord.id,
              entryType: PAYMENT_PAID_LEDGER_ENTRY_TYPE,
              amount: new Prisma.Decimal(-data.paymentAmount),
              runningBalance: purchaseBalance.minus(new Prisma.Decimal(data.paymentAmount)),
              description: `Payment to company supplier ${invoiceNumber}`,
              referenceNumber: paymentRecord.referenceNumber || invoiceNumber
            }
          });
        }
      } else {
        const party = await tx.party.findUnique({ where: { id: partyIdToUse } });
        if (!party) {
          throw new Error('Party Supplier not found.');
        }

        const lastLedger = await tx.ledgerEntry.findFirst({
          where: { partyId: partyIdToUse },
          orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
        });
        const previousBalance = new Prisma.Decimal(lastLedger?.runningBalance ?? 0);
        const purchaseBalance = previousBalance.plus(new Prisma.Decimal(totalAmount));

        await tx.ledgerEntry.create({
          data: {
            partyId: partyIdToUse,
            transactionId: purchase.id,
            entryType: PURCHASE_LEDGER_ENTRY_TYPE,
            amount: new Prisma.Decimal(totalAmount),
            runningBalance: purchaseBalance,
            description: `Purchase invoice ${invoiceNumber}`,
            referenceNumber: invoiceNumber
          }
        });

        if (data.paymentAmount > 0) {
          const paymentRecord = await tx.payment.create({
            data: {
              partyId: partyIdToUse,
              paymentMethod: data.paymentMethod,
              amount: new Prisma.Decimal(data.paymentAmount),
              referenceNumber: data.referenceNumber || null,
              status: new Prisma.Decimal(data.paymentAmount).lt(totalAmount) ? PARTIAL_PAYMENT_STATUS : COMPLETED_PAYMENT_STATUS,
              notes: data.notes || null
            }
          });

          await tx.paymentAllocation.create({
            data: {
              paymentId: paymentRecord.id,
              transactionId: purchase.id,
              amount: new Prisma.Decimal(data.paymentAmount)
            }
          });

          await tx.ledgerEntry.create({
            data: {
              partyId: partyIdToUse,
              transactionId: purchase.id,
              paymentId: paymentRecord.id,
              entryType: PAYMENT_PAID_LEDGER_ENTRY_TYPE,
              amount: new Prisma.Decimal(-data.paymentAmount),
              runningBalance: purchaseBalance.minus(new Prisma.Decimal(data.paymentAmount)),
              description: `Payment to party supplier ${invoiceNumber}`,
              referenceNumber: paymentRecord.referenceNumber || invoiceNumber
            }
          });
        }
      }

      const productQuantities = resolvedItems.reduce((map, item) => {
        const existing = map.get(item.productId ?? 0) ?? new Prisma.Decimal(0);
        map.set(item.productId ?? 0, existing.plus(new Prisma.Decimal(item.quantity)));
        return map;
      }, new Map<number, Prisma.Decimal>());

      for (const [productId, quantity] of productQuantities.entries()) {
        const balance = await tx.stockBalance.findUnique({ where: { productId } });
        const currentQuantity = new Prisma.Decimal(balance?.quantityOnHand ?? 0);
        const newQuantity = currentQuantity.plus(quantity);
        const matchedItem = resolvedItems.find((item) => item.productId === productId);
        const unitCost = matchedItem?.buyRate ?? matchedItem?.unitPrice ?? 0;

        await tx.stockMovement.create({
          data: {
            productId,
            transactionId: purchase.id,
            movementType: PURCHASE_STOCK_MOVEMENT_TYPE,
            quantity,
            unitCost: new Prisma.Decimal(unitCost),
            notes: `Purchase invoice ${invoiceNumber}`
          }
        });

        const currentAverageCost = new Prisma.Decimal(balance?.averageCost ?? 0);
        const newAverageCost = currentQuantity.gt(0)
          ? currentQuantity.times(currentAverageCost).plus(quantity.times(new Prisma.Decimal(unitCost))).div(newQuantity)
          : new Prisma.Decimal(unitCost);

        const stockBalanceData: { quantityOnHand: Prisma.Decimal; averageCost?: Prisma.Decimal | null } = {
          quantityOnHand: newQuantity,
          averageCost: newAverageCost
        };

        if (companyIdToUse) {
          await tx.product.updateMany({
            where: { id: productId, companyId: null },
            data: { companyId: companyIdToUse }
          });
        }

        await tx.stockBalance.upsert({
          where: { productId },
          update: stockBalanceData,
          create: {
            productId,
            quantityOnHand: newQuantity,
            reservedQuantity: new Prisma.Decimal(0),
            averageCost: stockBalanceData.averageCost ?? null
          }
        });

        await tx.product.update({
          where: { id: productId },
          data: {
            defaultPurchasePrice: new Prisma.Decimal(unitCost)
          }
        });
      }

      return {
        purchaseId: purchase.id,
        supplier: supplierType === 'company'
          ? await tx.company.findUnique({ where: { id: companyIdToUse }, select: { id: true, name: true, phone: true } })
          : await tx.party.findUnique({ where: { id: partyIdToUse }, select: { id: true, name: true, phone: true } })
      };
    }, { timeout: 15000 });

      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Purchase creation failed.');
      if (!isUniqueConstraintError(error)) {
        throw lastError;
      }
    }
  }

  if (!purchaseResult) {
    throw lastError ?? new Error('Purchase creation failed after multiple attempts.');
  }

  const purchaseId = purchaseResult.purchaseId;
    if (!purchaseId) {
      return { success: false, message: 'Purchase creation failed: missing transaction ID.' };
    }
    const smsTarget = purchaseResult.supplier;

    if (supplierType === 'party' && smsTarget) {
      const smsAmount = totalAmount.toFixed(2);
      const smsMessage = `প্রিয় ${smsTarget.name}, আপনার Purchase invoice তৈরি হয়েছে। মোট: ৳${smsAmount}. ধন্যবাদ.`;

      await queueTransactionSmsNotification({
        partyId: smsTarget.id,
        transactionId: purchaseId,
        phoneNumber: smsTarget.phone,
        partyName: smsTarget.name,
        message: smsMessage,
        saleType: 'MIXED',
        transactionType: 'PURCHASE'
      });
    }

    revalidatePurchaseData({ path: redirectPath });

    const productTypes = new Set(items.map((item) => item.productType));
    const stockProductTypes = new Set(['FEED', 'MEDICINE', 'CHICK']);
    const hasOnlyStockTypes = [...productTypes].every((t) => stockProductTypes.has(t));
    let successMessage = 'Purchase invoice created successfully.';

    if (hasOnlyStockTypes && productTypes.size === 1) {
      const type = [...productTypes][0];
      if (type === 'FEED') {
        successMessage = 'Feed stock added successfully.';
      } else if (type === 'MEDICINE') {
        successMessage = 'Medicine stock added successfully.';
      } else if (type === 'CHICK') {
        successMessage = 'Hatchling / Chick stock added successfully.';
      }
    }

    return { success: true, message: successMessage, transactionId: purchaseId };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Purchase creation failed.' };
  }
}

export async function createCompanyStockPurchaseTransaction(formData: FormData): Promise<PurchaseActionResult> {
  return createPurchaseTransactionInternal(formData);
}

export async function createPurchaseTransaction(formData: FormData): Promise<never> {
  const result = await createPurchaseTransactionInternal(formData);
  const redirectPath = formData.get('redirectPath')?.toString() || '/dashboard/purchases';
  const url = new URL(redirectPath, 'http://localhost');

  if (!result.success) {
    url.searchParams.set('error', result.message);
    redirect(url.toString() as never);
  }

  const cookiesStore = await cookies();
  cookiesStore.set({
    name: 'purchaseSuccess',
    value: result.message,
    path: '/dashboard',
    maxAge: 5,
    sameSite: 'lax'
  });

  url.searchParams.set('success', result.message);
  redirect(url.toString() as never);
}

export async function getPurchasesPageData({ page, search }: { page: number; search?: string }) {
  const take = DEFAULT_PAGE_SIZE;
  const skip = (Math.max(page, 1) - 1) * take;
  const where: Prisma.TransactionWhereInput = {
    transactionType: PURCHASE_TRANSACTION_TYPE
  };

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { invoiceNumber: { contains: term } },
      { party: { name: { contains: term } } },
      { party: { phone: { contains: term } } },
      { party: { email: { contains: term } } },
      { company: { name: { contains: term } } }
    ] as Prisma.TransactionWhereInput['OR'];
  }

  const [purchases, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      skip,
      take,
      select: {
        id: true,
        invoiceNumber: true,
        transactionDate: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        party: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } }
      }
    }),
    prisma.transaction.count({ where })
  ]);

  return {
    purchases,
    total,
    totalPages: Math.max(1, Math.ceil(total / take)),
    page: Math.min(page, Math.max(1, Math.ceil(total / take)))
  };
}

export type PurchaseDetail = Prisma.TransactionGetPayload<{
  include: {
    party: { select: { id: true; name: true; phone: true; email: true; address: true } };
    company: { select: { id: true; name: true; contactPerson: true; phone: true; email: true; address: true } };
    transactionItems: { include: { product: true } };
    payments: { include: { payment: true } };
    ledgerEntries: true;
  };
}>;

// Record party supplier product purchases (eggs/chicken) as PURCHASE transactions
// This allows the settlement system to offset customer debt with party supplier sales
export async function recordSupplierProductPurchase({
  partyId,
  eggQuantity,
  eggPrice,
  chickenQuantity,
  chickenPrice,
  totalPrice
}: {
  partyId: number;
  eggQuantity: number;
  eggPrice: number;
  chickenQuantity: number;
  chickenPrice: number;
  totalPrice: number;
}) {
  try {
    await requireUser();

const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) {
      return { success: false, message: 'Party Supplier not found.' };
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const invoiceNumber = getInvoiceNumber('PUR');
      try {
        await prisma.$transaction(async (tx) => {
       const eggProduct = eggQuantity > 0 ? await tx.product.findFirst({
         where: { productType: 'EGG' },
         orderBy: { id: 'asc' }
       }) : null;
       const chickenProduct = chickenQuantity > 0 ? await tx.product.findFirst({
         where: { productType: 'CHICKEN' },
         orderBy: { id: 'asc' }
       }) : null;

       let resolvedEggProductId: number | undefined;
       if (eggQuantity > 0) {
         if (eggProduct) {
           resolvedEggProductId = eggProduct.id;
         } else {
           const eggCount = await tx.product.count({ where: { productType: 'EGG' } });
           const newProduct = await tx.product.create({
             data: {
               code: `EGG-${String(eggCount + 1).padStart(3, '0')}`,
               name: 'Eggs',
               productType: 'EGG',
               unit: 'pcs',
               isActive: true
             }
           });
           resolvedEggProductId = newProduct.id;
         }
       }

       let resolvedChickenProductId: number | undefined;
       if (chickenQuantity > 0) {
         if (chickenProduct) {
           resolvedChickenProductId = chickenProduct.id;
         } else {
           const chickenCount = await tx.product.count({ where: { productType: 'CHICKEN' } });
           const newProduct = await tx.product.create({
             data: {
               code: `CHICKEN-${String(chickenCount + 1).padStart(3, '0')}`,
               name: 'Chicken',
               productType: 'CHICKEN',
               unit: 'kg',
               isActive: true
             }
           });
           resolvedChickenProductId = newProduct.id;
         }
       }

        const invoiceNumber = getInvoiceNumber('PUR');
        const dueAmount = totalPrice;

       const purchase = await tx.transaction.create({
         data: {
           transactionType: PURCHASE_TRANSACTION_TYPE,
           partyId,
           transactionDate: new Date(),
           invoiceNumber,
           status: PENDING_TRANSACTION_STATUS,
           subtotal: new Prisma.Decimal(totalPrice),
           discount: new Prisma.Decimal(0),
           tax: new Prisma.Decimal(0),
           totalAmount: new Prisma.Decimal(totalPrice),
           paidAmount: new Prisma.Decimal(0),
           dueAmount: new Prisma.Decimal(dueAmount),
           dueDate: null,
           referenceNumber: null,
           notes: `Party Supplier Products: ${eggQuantity > 0 ? `Eggs ${eggQuantity}@${eggPrice}` : ''} ${chickenQuantity > 0 ? `Chicken ${chickenQuantity}kg@${chickenPrice}` : ''}`.trim(),
           transactionItems: {
             createMany: {
               data: [
                  ...(eggQuantity > 0 && resolvedEggProductId ? [{
                    productId: resolvedEggProductId,
                    quantity: new Prisma.Decimal(eggQuantity),
                    unitPrice: new Prisma.Decimal(eggPrice),
                    lineTotal: new Prisma.Decimal(eggQuantity).times(new Prisma.Decimal(eggPrice)),
                    taxAmount: new Prisma.Decimal(0),
                    description: `Eggs (per piece) @ ৳${eggPrice}`
                  }] : []),
                  ...(chickenQuantity > 0 && resolvedChickenProductId ? [{
                    productId: resolvedChickenProductId,
                    quantity: new Prisma.Decimal(chickenQuantity),
                    unitPrice: new Prisma.Decimal(chickenPrice),
                    lineTotal: new Prisma.Decimal(chickenQuantity).times(new Prisma.Decimal(chickenPrice)),
                    taxAmount: new Prisma.Decimal(0),
                    description: `Chicken (per kg) @ ৳${chickenPrice}`
                  }] : [])
               ]
             }
           }
         }
       });

      // Create ledger entry for the purchase
      const lastLedger = await tx.ledgerEntry.findFirst({
        where: { partyId },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
      });
      const previousBalance = new Prisma.Decimal(lastLedger?.runningBalance ?? 0);
      const purchaseBalance = previousBalance.plus(new Prisma.Decimal(totalPrice));

      await tx.ledgerEntry.create({
        data: {
          partyId,
          transactionId: purchase.id,
          entryType: PURCHASE_LEDGER_ENTRY_TYPE,
          amount: new Prisma.Decimal(totalPrice),
          runningBalance: purchaseBalance,
          description: `Party supplier product purchase ${invoiceNumber}`,
          referenceNumber: invoiceNumber
        }
      });
    }, { timeout: 10000 });

    revalidatePurchaseData({ partyId });
    return { success: true, message: 'Party Supplier products recorded successfully.' };
  } catch (error) {
    lastError = error instanceof Error ? error : new Error('Failed to record party supplier products.');
    if (!isUniqueConstraintError(error)) {
      throw lastError;
    }
  }
}

    return { success: false, message: lastError?.message ?? 'Failed to record party supplier products after multiple attempts.' };
  } catch (error) {
    console.error('Error recording party supplier products:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to record party supplier products.' };
  }
}

export async function getPurchaseById(id: number) {
  return prisma.transaction.findFirst({
    where: { id, transactionType: PURCHASE_TRANSACTION_TYPE },
    select: {
      id: true,
      invoiceNumber: true,
      transactionDate: true,
      status: true,
      totalAmount: true,
      paidAmount: true,
      dueAmount: true,
      subtotal: true,
      discount: true,
      tax: true,
      referenceNumber: true,
      notes: true,
      party: { select: { id: true, name: true, phone: true, email: true, address: true } },
      company: { select: { id: true, name: true, contactPerson: true, phone: true, email: true, address: true } },
      transactionItems: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          taxAmount: true,
          description: true,
          product: { select: { id: true, name: true, productType: true, unit: true } }
        }
      },
      payments: {
        select: {
          id: true,
          amount: true,
          allocationDate: true,
          payment: { select: { id: true, amount: true, paymentDate: true, paymentMethod: true, referenceNumber: true, status: true } }
        }
      },
      ledgerEntries: {
        select: {
          id: true,
          entryDate: true,
          entryType: true,
          amount: true,
          runningBalance: true,
          description: true,
          referenceNumber: true
        }
      }
    }
  });
}

const getSuppliersForPurchasesCached = unstable_cache(async () => {
  const [parties, companies] = await Promise.all([
    prisma.party.findMany({
      where: {
        isActive: true,
        partyType: { in: ['PARTY', 'BOTH'] },
        NOT: [{ farmName: null }, { farmName: '' }]
      },
      orderBy: { farmName: 'asc' },
      select: { id: true, name: true, farmName: true, phone: true, email: true }
    }),
    prisma.company.findMany({
      where: {
        isActive: true
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, contactPerson: true, phone: true, email: true }
    })
  ]);

  return {
    parties: parties.map((p) => ({ id: p.id, name: p.farmName ?? p.name, phone: p.phone, email: p.email, type: 'party' as const })),
    companies: companies.map((c) => ({ id: c.id, name: c.name, contactPerson: c.contactPerson, phone: c.phone, email: c.email, type: 'company' as const }))
  };
}, ['purchase-supplier-options'], { tags: [CACHE_TAGS.parties, CACHE_TAGS.companies], revalidate: 300 });

export async function getSuppliersForPurchases() {
  return getSuppliersForPurchasesCached();
}

export async function getProductsForPurchases() {
  return prisma.product.findMany({
    where: { isActive: true, isArchived: false },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      productType: true,
      unit: true,
      defaultPurchasePrice: true,
      defaultSellingPrice: true,
      stockBalance: { select: { quantityOnHand: true } }
    }
  });
}
