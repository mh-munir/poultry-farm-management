'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';

const PURCHASE_TRANSACTION_TYPE = 'PURCHASE' as const;
const PENDING_TRANSACTION_STATUS = 'PENDING' as const;
const COMPLETED_TRANSACTION_STATUS = 'COMPLETED' as const;
const PURCHASE_LEDGER_ENTRY_TYPE = 'PURCHASE' as const;
const PAYMENT_PAID_LEDGER_ENTRY_TYPE = 'PAYMENT_PAID' as const;
const PARTIAL_PAYMENT_STATUS = 'PARTIAL' as const;
const COMPLETED_PAYMENT_STATUS = 'COMPLETED' as const;
const PURCHASE_STOCK_MOVEMENT_TYPE = 'PURCHASE' as const;

const purchaseItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().min(0.0001, 'Quantity must be greater than zero.'),
  unitPrice: z.coerce.number().min(0, 'Rate cannot be negative.'),
  description: z.string().trim().max(250).optional().or(z.literal(''))
});

const purchaseSchema = z.object({
  partyId: z.coerce.number().int().positive(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'OTHER']),
  paymentAmount: z.coerce.number().min(0, 'Payment amount cannot be negative.').optional().default(0),
  discount: z.coerce.number().min(0, 'Discount cannot be negative.').optional().default(0),
  referenceNumber: z.string().trim().max(100).optional().or(z.literal('')),
  dueDate: z.string().trim().optional().or(z.literal('')).transform((value) => value ? new Date(value) : undefined),
  notes: z.string().trim().max(250).optional().or(z.literal('')),
  items: z.array(purchaseItemSchema).min(1, 'Add at least one purchase item.')
});

function normalizePurchaseInput(formData: FormData) {
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
    dueDate: formData.get('dueDate')?.toString() ?? '',
    notes: formData.get('notes')?.toString() ?? '',
    items
  };
}

function generatePurchaseInvoiceNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
  return `PUR-${datePart}-${randomPart}`;
}

export async function createPurchaseTransaction(formData: FormData) {
  await requireUser();

  const parsed = purchaseSchema.safeParse(normalizePurchaseInput(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Purchase validation failed.';
    const url = new URL('/dashboard/purchases', 'http://localhost');
    url.searchParams.set('error', message);
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  const data = parsed.data;
  const items = data.items;
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalAmount = subtotal - data.discount;

  if (totalAmount < 0) {
    const url = new URL('/dashboard/purchases', 'http://localhost');
    url.searchParams.set('error', 'Total amount cannot be negative.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  if (Number(data.paymentAmount) > totalAmount) {
    const url = new URL('/dashboard/purchases', 'http://localhost');
    url.searchParams.set('error', 'Payment cannot exceed the invoice total.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  try {
    await prisma.$transaction(async (tx) => {
      const party = await tx.party.findUnique({ where: { id: data.partyId } });
      if (!party) {
        throw new Error('Supplier not found.');
      }

      const invoiceNumber = generatePurchaseInvoiceNumber();
      const dueAmount = totalAmount - data.paymentAmount;
      const status = dueAmount > 0 ? PENDING_TRANSACTION_STATUS : COMPLETED_TRANSACTION_STATUS;

      const purchase = await tx.transaction.create({
        data: {
          transactionType: PURCHASE_TRANSACTION_TYPE,
          partyId: data.partyId,
          transactionDate: new Date(),
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
              data: items.map((item) => ({
                productId: item.productId,
                quantity: new Prisma.Decimal(item.quantity),
                unitPrice: new Prisma.Decimal(item.unitPrice),
                lineTotal: new Prisma.Decimal(item.quantity * item.unitPrice),
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
      const purchaseBalance = previousBalance.plus(new Prisma.Decimal(totalAmount));

      await tx.ledgerEntry.create({
        data: {
          partyId: data.partyId,
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
            partyId: data.partyId,
            paymentMethod: data.paymentMethod,
            amount: new Prisma.Decimal(data.paymentAmount),
            referenceNumber: data.referenceNumber || null,
            status: data.paymentAmount < totalAmount ? PARTIAL_PAYMENT_STATUS : COMPLETED_PAYMENT_STATUS,
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
            partyId: data.partyId,
            transactionId: purchase.id,
            paymentId: paymentRecord.id,
            entryType: PAYMENT_PAID_LEDGER_ENTRY_TYPE,
            amount: new Prisma.Decimal(-data.paymentAmount),
            runningBalance: purchaseBalance.minus(new Prisma.Decimal(data.paymentAmount)),
            description: `Payment to supplier ${invoiceNumber}`,
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
        const currentQuantity = new Prisma.Decimal(balance?.quantityOnHand ?? 0);
        const newQuantity = currentQuantity.plus(quantity);

        await tx.stockMovement.create({
          data: {
            productId,
            transactionId: purchase.id,
            movementType: PURCHASE_STOCK_MOVEMENT_TYPE,
            quantity,
            unitCost: new Prisma.Decimal(items.find((item) => item.productId === productId)?.unitPrice ?? 0),
            notes: `Purchase invoice ${invoiceNumber}`
          }
        });

        const stockBalanceData: { quantityOnHand: Prisma.Decimal; averageCost?: Prisma.Decimal | null } = {
          quantityOnHand: newQuantity
        };

        const unitCost = items.find((item) => item.productId === productId)?.unitPrice ?? 0;
        if (unitCost) {
          stockBalanceData.averageCost = new Prisma.Decimal(unitCost);
        }

        if (balance) {
          await tx.stockBalance.update({
            where: { productId },
            data: stockBalanceData
          });
        } else {
          await tx.stockBalance.create({
            data: {
              productId,
              quantityOnHand: newQuantity,
              reservedQuantity: new Prisma.Decimal(0),
              averageCost: stockBalanceData.averageCost ?? null
            }
          });
        }
      }
    });
  } catch (error) {
    const url = new URL('/dashboard/purchases', 'http://localhost');
    url.searchParams.set('error', error instanceof Error ? error.message : 'Purchase creation failed.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  revalidatePath('/dashboard/purchases');
  const url = new URL('/dashboard/purchases', 'http://localhost');
  url.searchParams.set('success', 'Purchase invoice created successfully.');
  // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for success messages
  redirect(url.toString());
}

export async function getPurchasesPageData({ page, search }: { page: number; search?: string }) {
  const take = 8;
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
      { party: { email: { contains: term } } }
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
        party: { select: { id: true, name: true } }
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
    transactionItems: { include: { product: true } };
    payments: { include: { payment: true } };
    ledgerEntries: true;
  };
}>;

export async function getPurchaseById(id: number) {
  return prisma.transaction.findFirst({
    where: { id, transactionType: PURCHASE_TRANSACTION_TYPE },
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

export async function getSuppliersForPurchases() {
  return prisma.party.findMany({
    where: { isActive: true, partyType: { in: ['SUPPLIER', 'BOTH'] } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, phone: true, email: true }
  });
}

export async function getProductsForPurchases() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      unit: true,
      defaultPurchasePrice: true,
      stockBalance: { select: { quantityOnHand: true } }
    }
  });
}
