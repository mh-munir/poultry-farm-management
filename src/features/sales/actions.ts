'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';

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

export async function createSaleTransaction(formData: FormData) {
  await requireUser();

  const parsed = saleSchema.safeParse(normalizeSaleInput(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Sale validation failed.';
    redirect(`/dashboard/sales?error=${encodeURIComponent(message)}`);
  }

  const data = parsed.data;
  const items = data.items;
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalAmount = subtotal - data.discount;

  if (totalAmount < 0) {
    redirect(`/dashboard/sales?error=${encodeURIComponent('Total amount cannot be negative.')}`);
  }

  if (Number(data.paymentAmount) > totalAmount) {
    redirect(`/dashboard/sales?error=${encodeURIComponent('Payment cannot exceed the invoice total.')}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const party = await tx.party.findUnique({ where: { id: data.partyId } });
      if (!party) {
        throw new Error('Customer not found.');
      }

      const invoiceNumber = generateInvoiceNumber();
      const dueAmount = totalAmount - data.paymentAmount;
      const status = dueAmount > 0 ? PENDING_TRANSACTION_STATUS : COMPLETED_TRANSACTION_STATUS;

      const sale = await tx.transaction.create({
        data: {
          transactionType: SALE_TRANSACTION_TYPE,
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
      const saleBalance = previousBalance.plus(new Prisma.Decimal(totalAmount));

      await tx.ledgerEntry.create({
        data: {
          partyId: data.partyId,
          transactionId: sale.id,
          entryType: SALE_LEDGER_ENTRY_TYPE,
          amount: new Prisma.Decimal(totalAmount),
          runningBalance: saleBalance,
          description: `Sale invoice ${invoiceNumber}`,
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
            transactionId: sale.id,
            amount: new Prisma.Decimal(data.paymentAmount)
          }
        });

        await tx.ledgerEntry.create({
          data: {
            partyId: data.partyId,
            transactionId: sale.id,
            paymentId: paymentRecord.id,
            entryType: PAYMENT_RECEIVED_LEDGER_ENTRY_TYPE,
            amount: new Prisma.Decimal(-data.paymentAmount),
            runningBalance: saleBalance.minus(new Prisma.Decimal(data.paymentAmount)),
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
    });
  } catch (error) {
    redirect('/dashboard/sales?error=' + encodeURIComponent(error instanceof Error ? error.message : 'Sale creation failed.'));
  }

  revalidatePath('/dashboard/sales');
  redirect('/dashboard/sales?success=' + encodeURIComponent('Sale invoice created successfully.'));
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
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      unit: true,
      defaultSellingPrice: true,
      stockBalance: { select: { quantityOnHand: true } }
    }
  });
}
