import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db';

const stockSchema = z.object({
  name: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  buyRate: z.coerce.number().nonnegative(),
  salesRate: z.coerce.number().nonnegative()
});

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getProductType(stockType: string) {
  return stockType === 'medicine' ? 'MEDICINE' : 'FEED';
}

function getCategoryName(stockType: string) {
  return stockType === 'medicine' ? 'Medicine' : 'Feed';
}

function getUnit(stockType: string) {
  return stockType === 'medicine' ? 'box' : 'bag';
}

function mapProductToStockItem(product: {
  id: number;
  name: string;
  defaultPurchasePrice: unknown;
  defaultSellingPrice: unknown;
  stockBalance?: { quantityOnHand?: unknown } | null;
}) {
  return {
    id: product.id,
    name: product.name,
    quantity: toNumber(product.stockBalance?.quantityOnHand ?? 0),
    buyRate: toNumber(product.defaultPurchasePrice ?? 0),
    salesRate: toNumber(product.defaultSellingPrice ?? 0)
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ stockType: string }> }) {
  const { stockType } = await params;
  const productType = getProductType(stockType);

  const products = await prisma.product.findMany({
    where: {
      productType,
      isActive: true
    },
    include: {
      stockBalance: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  return NextResponse.json(products.map(mapProductToStockItem));
}

export async function POST(request: Request, { params }: { params: Promise<{ stockType: string }> }) {
  const { stockType } = await params;
  const productType = getProductType(stockType);
  const categoryName = getCategoryName(stockType);
  const unit = getUnit(stockType);

  const body = await request.json().catch(() => null);
  const parsed = stockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid stock payload' }, { status: 400 });
  }

  const { name, quantity, buyRate, salesRate } = parsed.data;
  const code = `${productType.toLowerCase()}-${slugify(name)}`;

  const category = await prisma.productCategory.upsert({
    where: { name: categoryName },
    update: {},
    create: {
      name: categoryName,
      slug: slugify(categoryName),
      description: `${categoryName} items`,
      isActive: true
    }
  });

  const product = await prisma.product.upsert({
    where: { code },
    update: {
      name,
      productType,
      unit,
      categoryId: category.id,
      defaultPurchasePrice: buyRate,
      defaultSellingPrice: salesRate,
      isActive: true
    },
    create: {
      code,
      name,
      productType,
      unit,
      categoryId: category.id,
      defaultPurchasePrice: buyRate,
      defaultSellingPrice: salesRate,
      isActive: true
    }
  });

  const existingBalance = await prisma.stockBalance.findUnique({
    where: { productId: product.id }
  });

  const previousQuantity = toNumber(existingBalance?.quantityOnHand ?? 0);
  const nextQuantity = previousQuantity + quantity;
  const previousCost = toNumber(existingBalance?.averageCost ?? 0);
  const averageCost = previousQuantity > 0
    ? ((previousCost * previousQuantity) + (buyRate * quantity)) / nextQuantity
    : buyRate;

  await prisma.stockBalance.upsert({
    where: { productId: product.id },
    update: {
      quantityOnHand: nextQuantity,
      averageCost
    },
    create: {
      productId: product.id,
      quantityOnHand: nextQuantity,
      averageCost
    }
  });

  await prisma.stockMovement.create({
    data: {
      productId: product.id,
      movementType: 'STOCK_IN',
      quantity,
      unitCost: buyRate,
      notes: `Added stock for ${name}`
    }
  });

  const refreshedProduct = await prisma.product.findUnique({
    where: { id: product.id },
    include: { stockBalance: true }
  });

  return NextResponse.json(mapProductToStockItem(refreshedProduct as any));
}
