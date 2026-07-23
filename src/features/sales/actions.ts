'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { getSaleSmsSuccessMessage, queueSaleSmsNotification } from '@/lib/sms/service';
import type { SmsSaleType } from '@/lib/sms/types';

const SALE_TRANSACTION_TYPE = 'SALE' as const;
const PENDING_TRANSACTION_STATUS = 'PENDING' as const;
const COMPLETED_TRANSACTION_STATUS = 'COMPLETED' as const;
const SALE_LEDGER_ENTRY_TYPE = 'SALE' as const;
const PAYMENT_RECEIVED_LEDGER_ENTRY_TYPE = 'PAYMENT_RECEIVED' as const;
const PARTIAL_PAYMENT_STATUS = 'PARTIAL' as const;
const COMPLETED_PAYMENT_STATUS = 'COMPLETED' as const;
const SALE_STOCK_MOVEMENT_TYPE = 'SALE' as const;

const saleItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().min(0.0001, 'Quantity must be greater than zero.'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative.'),
  description: z.string().trim().max(250).optional().or(z.literal(''))
});

const saleSchema = z.object({
  partyId: z.coerce.number().int().positive(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'OTHER']),
  paymentAmount: z.coerce.number().min(0, 'Payment amount cannot be negative.').optional().default(0),
  discount: z.coerce.number().min(0, 'Discount cannot be negative.').optional().default(0),
  referenceNumber: z.string().trim().max(100).optional().or(z.literal('')),
  notes: z.string().trim().max(250).optional().or(z.literal('')),
  items: z.array(saleItemSchema).min(1, 'Add at least one sale item.')
});

function normalizeSaleInput(formData: FormData) {
  const productIds = formData.getAll('productId').map((value) => value?.toString() ?? '');
  const quantities = formData.getAll('quantity').map((value) => value?.toString() ?? '0');
  const unitPrices = formData.getAll('unitPrice').map((value) => value?.toString() ?? '0');
  const descriptions = formData.getAll('description').map((value) => value?.toString() ?? '');

  const items = productIds.map((productId, index) => ({
    productId,
    quantity: quantities[index] ?? '0',
    unitPrice: unitPrices[index] ?? '0',
    description: descriptions[index] ?? ''
  })).filter((item) => item.productId.trim() && Number(item.quantity) > 0);

  return {
    partyId: formData.get('partyId')?.toString() ?? '',
    paymentMethod: formData.get('paymentMethod')?.toString() ?? 'CASH',
    paymentAmount: formData.get('paymentAmount')?.toString() ?? '0',
    discount: formData.get('discount')?.toString() ?? '0',
    referenceNumber: formData.get('referenceNumber')?.toString() ?? '',
    notes: formData.get('notes')?.toString() ?? '',
    items
  };
}

function generateInvoiceNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
  return `INV-${datePart}-${randomPart}`;
}

function validateSaleAmounts(data: z.infer<typeof saleSchema>) {
  const subtotal = data.items.reduce((sum, item) => {
    return sum.plus(new Prisma.Decimal(item.quantity).times(new Prisma.Decimal(item.unitPrice)));
  }, new Prisma.Decimal(0));
  const discount = new Prisma.Decimal(data.discount);
  const paymentAmount = new Prisma.Decimal(data.paymentAmount);
  const totalAmount = subtotal.minus(discount);

  if (totalAmount.lt(0)) {
    throw new Error('Total amount cannot be negative.');
  }

  if (paymentAmount.gt(totalAmount)) {
    throw new Error('Payment cannot exceed the invoice total.');
  }

  return { subtotal, totalAmount, discount, paymentAmount };
}

function determineSaleType(productTypes: string[]): SmsSaleType {
  const uniqueProductTypes = new Set(productTypes);

  if (uniqueProductTypes.size === 1 && uniqueProductTypes.has('MEDICINE')) {
    return 'MEDICINE';
  }

  if (uniqueProductTypes.size === 1 && uniqueProductTypes.has('FEED')) {
    return 'FEED';
  }

  return 'MIXED';
}

function formatSmsAmount(value: Prisma.Decimal) {
  return value.toFixed(2);
}

async function saveSaleTransaction(data: z.infer<typeof saleSchema>) {
  const items = data.items;
  const { subtotal, totalAmount, discount, paymentAmount } = validateSaleAmounts(data);

  const savedSale = await prisma.$transaction(async (tx) => {
    const party = await tx.party.findUnique({ where: { id: data.partyId } });
    if (!party) {
      throw new Error('Customer not found.');
    }

    const products = await tx.product.findMany({
      where: { id: { in: items.map((item) => item.productId) } },
      select: { id: true, productType: true }
    });
    const productTypes = new Map(products.map((product) => [product.id, product.productType]));
    const invalidProduct = items.find((item) => !['FEED', 'MEDICINE'].includes(productTypes.get(item.productId) ?? ''));

    if (invalidProduct) {
      throw new Error('Only feed and medicine products can be sold from this entry.');
    }

    const saleType = determineSaleType(items.map((item) => productTypes.get(item.productId) ?? ''));
    const invoiceNumber = generateInvoiceNumber();
    const dueAmount = totalAmount.minus(paymentAmount);
    const status = dueAmount.gt(0) ? PENDING_TRANSACTION_STATUS : COMPLETED_TRANSACTION_STATUS;

    const sale = await tx.transaction.create({
      data: {
        transactionType: SALE_TRANSACTION_TYPE,
        partyId: data.partyId,
        transactionDate: new Date(),
        invoiceNumber,
        status,
        subtotal,
        discount,
        tax: new Prisma.Decimal(0),
        totalAmount,
        paidAmount: paymentAmount,
        dueAmount,
        referenceNumber: data.referenceNumber || null,
        notes: data.notes || null,
        transactionItems: {
          createMany: {
            data: items.map((item) => ({
              productId: item.productId,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              lineTotal: new Prisma.Decimal(item.quantity).times(new Prisma.Decimal(item.unitPrice)),
              taxAmount: new Prisma.Decimal(0),
              description: item.description || null
            }))
          }
        }
      }
    });

    const lastLedger = await tx.ledgerEntry.findFirst({
      where: { partyId: data.partyId },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
    });
    const previousBalance = new Prisma.Decimal(lastLedger?.runningBalance ?? 0);
    const saleBalance = previousBalance.plus(totalAmount);

    await tx.ledgerEntry.create({
      data: {
        partyId: data.partyId,
        transactionId: sale.id,
        entryType: SALE_LEDGER_ENTRY_TYPE,
        amount: totalAmount,
        runningBalance: saleBalance,
        description: `Sale invoice ${invoiceNumber}`,
        referenceNumber: invoiceNumber
      }
    });

    if (paymentAmount.gt(0)) {
      const paymentRecord = await tx.payment.create({
        data: {
          partyId: data.partyId,
          paymentMethod: data.paymentMethod,
          amount: paymentAmount,
          referenceNumber: data.referenceNumber || null,
          status: paymentAmount.lt(totalAmount) ? PARTIAL_PAYMENT_STATUS : COMPLETED_PAYMENT_STATUS,
          notes: data.notes || null
        }
      });

      await tx.paymentAllocation.create({
        data: {
          paymentId: paymentRecord.id,
          transactionId: sale.id,
          amount: paymentAmount
        }
      });

      await tx.ledgerEntry.create({
        data: {
          partyId: data.partyId,
          transactionId: sale.id,
          paymentId: paymentRecord.id,
          entryType: PAYMENT_RECEIVED_LEDGER_ENTRY_TYPE,
          amount: paymentAmount.negated(),
          runningBalance: saleBalance.minus(paymentAmount),
          description: `Payment for invoice ${invoiceNumber}`,
          referenceNumber: paymentRecord.referenceNumber || invoiceNumber
        }
      });
    }

    const productQuantities = items.reduce((map, item) => {
      const existing = map.get(item.productId) ?? new Prisma.Decimal(0);
      map.set(item.productId, existing.plus(new Prisma.Decimal(item.quantity)));
      return map;
    }, new Map<number, Prisma.Decimal>());

    for (const [productId, quantity] of productQuantities.entries()) {
      const balance = await tx.stockBalance.findUnique({ where: { productId } });
      if (!balance) {
        throw new Error('Stock balance not found for one or more sale products.');
      }

      const remaining = new Prisma.Decimal(balance.quantityOnHand).minus(quantity);
      if (remaining.lt(0)) {
        throw new Error('Stock cannot go below zero for a sale item.');
      }

      await tx.stockMovement.create({
        data: {
          productId,
          transactionId: sale.id,
          movementType: SALE_STOCK_MOVEMENT_TYPE,
          quantity,
          unitCost: new Prisma.Decimal(items.find((item) => item.productId === productId)?.unitPrice ?? 0),
          notes: `Sale invoice ${invoiceNumber}`
        }
      });

      await tx.stockBalance.update({
        where: { productId },
        data: { quantityOnHand: remaining }
      });
    }

    return {
      transactionId: sale.id,
      partyId: party.id,
      partyName: party.name,
      phoneNumber: party.phone,
      farmName: party.farmName,
      invoiceNumber,
      saleType,
      totalAmount,
      paidAmount: paymentAmount,
      dueAmount
    };
  });

  const smsResult = await queueSaleSmsNotification({
    transactionId: savedSale.transactionId,
    partyId: savedSale.partyId,
    partyName: savedSale.partyName,
    phoneNumber: savedSale.phoneNumber,
    farmName: savedSale.farmName,
    invoiceNumber: savedSale.invoiceNumber,
    saleType: savedSale.saleType,
    totalAmount: formatSmsAmount(savedSale.totalAmount),
    paidAmount: formatSmsAmount(savedSale.paidAmount),
    dueAmount: formatSmsAmount(savedSale.dueAmount)
  });

  revalidatePath('/dashboard/sales');
  revalidatePath('/dashboard/parties');

  return { sale: savedSale, sms: smsResult };
}

export async function createSaleTransaction(formData: FormData) {
  await requireUser();

  const parsed = saleSchema.safeParse(normalizeSaleInput(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Sale validation failed.';
    const url = new URL('/dashboard/sales', 'http://localhost');
    url.searchParams.set('error', message);
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  const data = parsed.data;
  let result: Awaited<ReturnType<typeof saveSaleTransaction>>;
  try {
    result = await saveSaleTransaction(data);
  } catch (error) {
    const url = new URL('/dashboard/sales', 'http://localhost');
    url.searchParams.set('error', error instanceof Error ? error.message : 'Sale creation failed.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  const url = new URL('/dashboard/sales', 'http://localhost');
  url.searchParams.set('success', getSaleSmsSuccessMessage(result.sms.status));
  // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for success messages
  redirect(url.toString());
}

export async function createSaleTransactionWithToast(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    await requireUser();

    const parsed = saleSchema.safeParse(normalizeSaleInput(formData));
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Sale validation failed.';
      return { success: false, message };
    }

    const result = await saveSaleTransaction(parsed.data);
    return { success: true, message: getSaleSmsSuccessMessage(result.sms.status) };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Sale creation failed.' };
  }
}

export async function getSalesPageData({
  page,
  search
}: {
  page: number;
  search?: string;
}) {
  const take = 8;
  const skip = (Math.max(page, 1) - 1) * take;

  const where: Prisma.TransactionWhereInput = {
    transactionType: SALE_TRANSACTION_TYPE
  };

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { invoiceNumber: { contains: term } },
      { party: { name: { contains: term } } },
      { party: { phone: { contains: term } } },
      { party: { email: { contains: term } } }
    ] as Prisma.TransactionWhereInput['OR'];
  }

  const [sales, total] = await Promise.all([
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
        party: { select: { id: true, name: true } }
      }
    }),
    prisma.transaction.count({ where })
  ]);

  return {
    sales,
    total,
    totalPages: Math.max(1, Math.ceil(total / take)),
    page: Math.min(page, Math.max(1, Math.ceil(total / take)))
  };
}

type SaleDetail = Prisma.TransactionGetPayload<{
  include: {
    party: { select: { id: true; name: true; phone: true; email: true; address: true } };
    transactionItems: { include: { product: true } };
    payments: { include: { payment: true } };
    ledgerEntries: true;
  };
}>;

export async function getSaleById(id: number): Promise<SaleDetail | null> {
  return prisma.transaction.findFirst({
    where: { id, transactionType: SALE_TRANSACTION_TYPE },
    include: {
      party: { select: { id: true, name: true, phone: true, email: true, address: true } },
      transactionItems: {
        include: {
          product: true
        }
      },
      payments: {
        include: {
          payment: true
        }
      },
      ledgerEntries: true
    }
  });
}

export async function getCustomersForSales() {
  return prisma.party.findMany({
    where: { isActive: true, partyType: { in: ['CUSTOMER', 'BOTH'] } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, phone: true, email: true }
  });
}

export async function getProductsForSales() {
  return prisma.product.findMany({
    where: { isActive: true, productType: { in: ['FEED', 'MEDICINE'] } },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      productType: true,
      unit: true,
      defaultSellingPrice: true,
      stockBalance: { select: { quantityOnHand: true } }
    }
  });
}
