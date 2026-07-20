'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';

const STOCK_MOVEMENT_TYPE_PREFIX = 'STOCK_MOVEMENT' as const;

const movementSchema = z.object({
  productId: z.coerce.number().int().positive(),
  movementType: z.enum(['OPENING', 'PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'WASTAGE', 'PRODUCTION']),
  quantity: z.coerce.number().min(0.0001, 'Quantity must be greater than zero.'),
  unitCost: z.coerce.number().min(0).optional().default(0),
  adjustmentMode: z.enum(['INCREASE', 'DECREASE']).optional(),
  notes: z.string().trim().max(250).optional().or(z.literal(''))
}).superRefine((data, ctx) => {
  if (data.movementType === 'ADJUSTMENT' && !data.adjustmentMode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['adjustmentMode'],
      message: 'Adjustment direction is required for stock adjustment.'
    });
  }
});

function normalizeMovementInput(formData: FormData) {
  return {
    productId: formData.get('productId')?.toString() ?? '',
    movementType: formData.get('movementType')?.toString() ?? 'ADJUSTMENT',
    quantity: formData.get('quantity')?.toString() ?? '0',
    unitCost: formData.get('unitCost')?.toString() ?? '0',
    adjustmentMode: formData.get('adjustmentMode')?.toString() ?? undefined,
    notes: formData.get('notes')?.toString() ?? ''
  };
}

export async function createStockMovement(formData: FormData) {
  await requireUser();
  const parsed = movementSchema.safeParse(normalizeMovementInput(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    redirect(`/dashboard/stock?error=${encodeURIComponent(message)}`);
  }

  const data = parsed.data;
  const quantity = Number(data.quantity);
  const unitCost = Number(data.unitCost);

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) {
        throw new Error('Product not found.');
      }

      const balance = await tx.stockBalance.findUnique({ where: { productId: data.productId } });
      const currentQuantity = Number(balance?.quantityOnHand ?? 0);
      const currentAverageCost = Number(balance?.averageCost ?? 0);
      const inboundTypes = new Set(['OPENING', 'PURCHASE', 'RETURN', 'PRODUCTION']);
      const outboundTypes = new Set(['SALE', 'WASTAGE']);
      const isIncrease = inboundTypes.has(data.movementType) || data.movementType === 'ADJUSTMENT' && data.adjustmentMode === 'INCREASE';
      const isDecrease = outboundTypes.has(data.movementType) || data.movementType === 'ADJUSTMENT' && data.adjustmentMode === 'DECREASE';

      if (!isIncrease && !isDecrease) {
        throw new Error('Invalid stock movement direction.');
      }

      if (!balance && isDecrease) {
        throw new Error('Cannot remove stock when no stock exists for this product.');
      }

      const newQuantity = isIncrease
        ? currentQuantity + quantity
        : currentQuantity - quantity;

      if (newQuantity < 0) {
        throw new Error('Stock cannot go below zero.');
      }

      await tx.stockMovement.create({
        data: {
          productId: data.productId,
          movementType: data.movementType,
          quantity: new Prisma.Decimal(quantity),
          unitCost: new Prisma.Decimal(unitCost),
          notes: (data.notes ?? '').trim() || null
        }
      });

      const stockBalanceData: { quantityOnHand: Prisma.Decimal; averageCost?: Prisma.Decimal | null } = {
        quantityOnHand: new Prisma.Decimal(newQuantity)
      };

      if (isIncrease) {
        const previousValue = currentQuantity * (currentAverageCost || 0);
        const nextValue = previousValue + quantity * unitCost;
        const nextAverageCost = newQuantity > 0 ? nextValue / newQuantity : 0;
        stockBalanceData.averageCost = new Prisma.Decimal(nextAverageCost);
      } else if (balance?.averageCost) {
        stockBalanceData.averageCost = balance.averageCost;
      }

      if (balance) {
        await tx.stockBalance.update({
          where: { productId: data.productId },
          data: stockBalanceData
        });
      } else {
        await tx.stockBalance.create({
          data: {
            productId: data.productId,
            quantityOnHand: new Prisma.Decimal(newQuantity),
            reservedQuantity: new Prisma.Decimal(0),
            averageCost: stockBalanceData.averageCost ?? null
          }
        });
      }
    });
  } catch (error) {
    redirect('/dashboard/stock?error=' + encodeURIComponent(error instanceof Error ? error.message : 'Stock movement failed.'));
  }

  revalidatePath('/dashboard/stock');
  redirect('/dashboard/stock?success=' + encodeURIComponent('Stock movement recorded successfully.'));
}

export async function getStockPageData({
  page,
  search,
  lowStockOnly
}: {
  page: number;
  search?: string;
  lowStockOnly?: boolean;
}) {
  const take = 8;
  const skip = (Math.max(page, 1) - 1) * take;

  const where: Prisma.ProductWhereInput = {};

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term } },
      { code: { contains: term } },
      { barcode: { contains: term } }
    ] as Prisma.ProductWhereInput['OR'];
  }

  try {
    const products = await prisma.product.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      skip,
      take,
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        barcode: true,
        lowStockThreshold: true,
        defaultPurchasePrice: true,
        defaultSellingPrice: true,
        stockBalance: { select: { quantityOnHand: true, reservedQuantity: true } },
        category: { select: { id: true, name: true } }
      }
    });

    const filtered = lowStockOnly
      ? products.filter((product) => Number(product.stockBalance?.quantityOnHand ?? 0) <= Number(product.lowStockThreshold ?? 0))
      : products;
    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + take);

    return {
      products: paginated,
      total,
      totalPages: Math.max(1, Math.ceil(total / take)),
      page: Math.min(page, Math.max(1, Math.ceil(total / take)))
    };
  } catch (error) {
    return { products: [], total: 0, totalPages: 1, page: 1 };
  }
}

export async function getStockHistory() {
  return prisma.stockMovement.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      movementType: true,
      quantity: true,
      unitCost: true,
      notes: true,
      createdAt: true,
      product: {
        select: { id: true, name: true, code: true }
      }
    }
  });
}

export async function getLowStockAlerts() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      name: true,
      code: true,
      unit: true,
      lowStockThreshold: true,
      stockBalance: { select: { quantityOnHand: true } }
    },
    orderBy: [{ name: 'asc' }]
  });

  return products.filter((product) =>
    Number(product.stockBalance?.quantityOnHand ?? 0) <= Number(product.lowStockThreshold ?? 0)
  );
}

export async function getProductsForStock() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      unit: true,
      productType: true,
      stockBalance: { select: { quantityOnHand: true } }
    }
  });
}
