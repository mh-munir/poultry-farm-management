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
    const url = new URL('/dashboard/stock', 'http://localhost');
    url.searchParams.set('error', message);
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
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
    const url = new URL('/dashboard/stock', 'http://localhost');
    url.searchParams.set('error', error instanceof Error ? error.message : 'Stock movement failed.');
    // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
    redirect(url.toString());
  }

  revalidatePath('/dashboard/stock');
  const url = new URL('/dashboard/stock', 'http://localhost');
  url.searchParams.set('success', 'Stock movement recorded successfully.');
  // @ts-expect-error typedRoutes only accepts literal paths, but dynamic query params are necessary for error messages
  redirect(url.toString());
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
  return prisma.product.findMany({
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

export async function getStockItemsByType(productType: 'FEED' | 'MEDICINE') {
  return prisma.product.findMany({
    where: { isActive: true, productType },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      unit: true,
      productType: true,
      defaultPurchasePrice: true,
      defaultSellingPrice: true,
      stockBalance: { select: { quantityOnHand: true } },
      transactionItems: {
        select: {
          transaction: {
            select: {
              id: true,
              transactionDate: true,
              paidAmount: true,
              dueAmount: true,
              party: { select: { name: true } }
            }
          }
        },
        where: {
          transaction: { transactionType: 'PURCHASE' }
        },
        orderBy: {
          transaction: { transactionDate: 'desc' }
        },
        take: 1
      }
    }
  });
}

const partySupplierSchema = z.object({
  name: z.string().min(1, 'Party / Company name is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  partyType: z.enum(['PARTY', 'COMPANY', 'BOTH']).default('PARTY'),
  email: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  farmName: z.string().optional().or(z.literal(''))
});

export async function createSupplierForStock(formData: FormData) {
  await requireUser();

  const raw = {
    name: formData.get('name')?.toString() ?? '',
    phone: formData.get('phone')?.toString() ?? '',
    partyType: formData.get('partyType')?.toString() ?? 'PARTY',
    email: formData.get('email')?.toString() ?? '',
    address: formData.get('address')?.toString() ?? '',
    farmName: formData.get('farmName')?.toString() ?? ''
  };

  const parsed = partySupplierSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? 'Invalid party supplier data.' };
  }

  const data = parsed.data;

  try {
    const party = await prisma.party.create({
      data: {
        name: data.name,
        phone: data.phone,
        partyType: data.partyType,
        email: data.email || null,
        address: data.address || null,
        farmName: data.farmName || null,
        isActive: true,
        openingBalance: 0
      },
      select: { id: true, name: true, phone: true, email: true, address: true, farmName: true, partyType: true }
    });

    revalidatePath('/dashboard/parties');
    revalidatePath('/dashboard/stock');

    return { success: true as const, message: `Party Supplier '${party.name}' created successfully.`, party };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Failed to create party supplier.' };
  }
}

const stockProductSchema = z.object({
  name: z.string().min(1, 'Product name is required.'),
  productType: z.enum(['FEED', 'MEDICINE']),
  unit: z.string().min(1, 'Unit is required.'),
  code: z.string().optional().or(z.literal('')),
  defaultPurchasePrice: z.coerce.number().min(0).optional().default(0),
  defaultSellingPrice: z.coerce.number().min(0).optional().default(0)
});

export async function createProductForStock(formData: FormData) {
  await requireUser();

  const raw = {
    name: formData.get('name')?.toString() ?? '',
    productType: formData.get('productType')?.toString() ?? 'FEED',
    unit: formData.get('unit')?.toString() ?? '',
    code: formData.get('code')?.toString() ?? '',
    defaultPurchasePrice: formData.get('defaultPurchasePrice')?.toString() ?? '0',
    defaultSellingPrice: formData.get('defaultSellingPrice')?.toString() ?? '0'
  };

  const parsed = stockProductSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? 'Invalid product data.' };
  }

  const data = parsed.data;

  try {
    const existingCount = await prisma.product.count({
      where: { productType: data.productType, isActive: true }
    });

    const product = await prisma.product.create({
      data: {
        code: data.code || `${data.productType}-${String(existingCount + 1).padStart(3, '0')}`,
        name: data.name,
        productType: data.productType,
        unit: data.unit,
        defaultPurchasePrice: new Prisma.Decimal(data.defaultPurchasePrice),
        defaultSellingPrice: new Prisma.Decimal(data.defaultSellingPrice),
        isActive: true
      },
      select: { id: true, name: true, code: true, productType: true, unit: true, defaultPurchasePrice: true, defaultSellingPrice: true }
    });

    revalidatePath('/dashboard/products');
    revalidatePath('/dashboard/stock');

    return { success: true as const, message: `Product '${product.name}' created successfully.`, product };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Failed to create product.' };
  }
}

export async function getFeedStockCompanyNames() {
  await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionType: 'PURCHASE',
      transactionItems: {
        some: {
          product: {
            productType: 'FEED'
          }
        }
      }
    },
    include: {
      party: {
        select: {
          id: true,
          name: true
        }
      }
    },
    distinct: ['partyId']
  });

  return transactions
    .map((tx) => ({
      id: tx.party.id,
      name: tx.party.name
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMedicineStockCompanyNames() {
  await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionType: 'PURCHASE',
      transactionItems: {
        some: {
          product: {
            productType: 'MEDICINE'
          }
        }
      }
    },
    include: {
      party: {
        select: {
          id: true,
          name: true
        }
      }
    },
    distinct: ['partyId']
  });

  return transactions
    .map((tx) => ({
      id: tx.party.id,
      name: tx.party.name
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
