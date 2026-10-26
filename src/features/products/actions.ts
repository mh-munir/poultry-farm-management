'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { DEFAULT_PAGE_SIZE } from '@/config/pagination';
import { prisma } from '@/server/db';
import { revalidateTags, CACHE_TAGS } from '@/lib/cache';

type ProductTypeValue = 'FEED' | 'MEDICINE' | 'EGG' | 'CHICKEN' | 'CHICK';

const productSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z.string().trim().min(2, 'Code must be at least 2 characters long.'),
  name: z.string().trim().min(2, 'Product name must be at least 2 characters long.'),
  productType: z.enum(['FEED', 'MEDICINE', 'EGG', 'CHICKEN', 'CHICK']),
  unit: z.string().trim().min(1, 'Unit is required.'),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  defaultPurchasePrice: z.coerce.number().min(0).optional().default(0),
  defaultSellingPrice: z.coerce.number().min(0).optional().default(0),
  imageUrl: z.string().trim().max(250).optional().or(z.literal('')),
  barcode: z.string().trim().max(80).optional().or(z.literal('')),
  openingStock: z.coerce.number().min(0).optional().default(0),
  lowStockThreshold: z.coerce.number().min(0).optional().default(0),
  isActive: z.boolean().default(true)
});

function normalizeProductInput(formData: FormData) {
  return {
    id: formData.get('id')?.toString() || undefined,
    code: formData.get('code')?.toString() ?? '',
    name: formData.get('name')?.toString() ?? '',
    productType: formData.get('productType')?.toString() ?? 'FEED',
    unit: formData.get('unit')?.toString() ?? '',
    categoryId: formData.get('categoryId')?.toString() ? Number(formData.get('categoryId')) : null,
    defaultPurchasePrice: formData.get('defaultPurchasePrice')?.toString() ?? '0',
    defaultSellingPrice: formData.get('defaultSellingPrice')?.toString() ?? '0',
    imageUrl: formData.get('imageUrl')?.toString() ?? '',
    barcode: formData.get('barcode')?.toString() ?? '',
    openingStock: formData.get('openingStock')?.toString() ?? '0',
    lowStockThreshold: formData.get('lowStockThreshold')?.toString() ?? '0',
    isActive: formData.get('isActive') === 'on'
  };
}

function isProductCodeUniqueConstraintError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.includes('code')
    : typeof target === 'string' && target.includes('code');
}

export async function createOrUpdateProduct(formData: FormData) {
  await requireUser();
  const parsed = productSchema.safeParse(normalizeProductInput(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    const url = new URL('/dashboard/products', 'http://localhost');
    url.searchParams.set('error', message);
    redirect(url.toString() as never);
  }

  const data = parsed.data;
  const payload = {
    code: data.code.trim(),
    name: data.name.trim(),
    productType: data.productType as ProductTypeValue,
    unit: data.unit.trim(),
    categoryId: data.categoryId ?? null,
    defaultPurchasePrice: data.defaultPurchasePrice ? new Prisma.Decimal(data.defaultPurchasePrice) : null,
    defaultSellingPrice: data.defaultSellingPrice ? new Prisma.Decimal(data.defaultSellingPrice) : null,
    imageUrl: data.imageUrl?.trim() || null,
    barcode: data.barcode?.trim() || null,
    isActive: data.isActive,
    stockBalance: data.openingStock > 0 ? {
      create: {
        quantityOnHand: new Prisma.Decimal(data.openingStock),
        reservedQuantity: new Prisma.Decimal(0),
        averageCost: data.defaultPurchasePrice ? new Prisma.Decimal(data.defaultPurchasePrice) : null
      }
    } : undefined
  };

  const existingProduct = await prisma.product.findFirst({
    where: {
      code: payload.code,
      ...(data.id ? { id: { not: data.id } } : {})
    },
    select: { id: true }
  });

  if (existingProduct) {
    const url = new URL('/dashboard/products', 'http://localhost');
    url.searchParams.set('error', 'Product code already exists. Use a different code or add stock to the existing product.');
    redirect(url.toString() as never);
  }

  try {
    if (data.id) {
      // Opening stock is created only with a new product. Re-creating this
      // one-to-one record on edit can fail or duplicate stock semantics.
      const updatePayload = { ...payload };
      delete updatePayload.stockBalance;
      await prisma.product.update({
        where: { id: data.id },
        data: updatePayload
      });
    } else {
      await prisma.product.create({ data: payload });
    }
  } catch (error) {
    const url = new URL('/dashboard/products', 'http://localhost');
    url.searchParams.set(
      'error',
      isProductCodeUniqueConstraintError(error)
        ? 'Product code already exists. Use a different code or add stock to the existing product.'
        : 'Product save failed. Please verify the data and try again.'
    );
    redirect(url.toString() as never);
  }

  revalidateTags([CACHE_TAGS.products, CACHE_TAGS.stock, CACHE_TAGS.dashboard]);
  revalidatePath('/dashboard/products');
  const url = new URL('/dashboard/products', 'http://localhost');
  url.searchParams.set('success', data.id ? 'Product updated successfully.' : 'Product created successfully.');
  redirect(url.toString() as never);
}

export async function deleteProduct(formData: FormData) {
  await requireUser();
  const productId = Number(formData.get('productId'));

  if (!productId) {
    const url = new URL('/dashboard/products', 'http://localhost');
    url.searchParams.set('error', 'A valid product id is required.');
    redirect(url.toString() as never);
  }

  try {
    const [transactionItemCount, stockMovementCount] = await Promise.all([
      prisma.transactionItem.count({ where: { productId } }),
      prisma.stockMovement.count({ where: { productId } })
    ]);

    if (transactionItemCount > 0 || stockMovementCount > 0) {
      const url = new URL('/dashboard/products', 'http://localhost');
      url.searchParams.set('error', 'This product cannot be deleted because it has transaction history.');
      redirect(url.toString() as never);
    }

    await prisma.product.update({
      where: { id: productId },
      data: { isArchived: true, deletedAt: new Date() }
    });
  } catch (error) {
    const url = new URL('/dashboard/products', 'http://localhost');
    url.searchParams.set('error', error instanceof Error ? error.message : 'Product deletion failed.');
    redirect(url.toString() as never);
  }

  revalidatePath('/dashboard/products');
  const url = new URL('/dashboard/products', 'http://localhost');
  url.searchParams.set('success', 'Product deleted successfully.');
  redirect(url.toString() as never);
}

export async function getProductPageData({
  page,
  search,
  categoryId,
  productType
}: {
  page: number;
  search?: string;
  categoryId?: string;
  productType?: string;
}) {
  const take = DEFAULT_PAGE_SIZE;
  const skip = (Math.max(page, 1) - 1) * take;

  const where: Prisma.ProductWhereInput = { isArchived: false };

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term } },
      { code: { contains: term } },
      { barcode: { contains: term } }
    ] as Prisma.ProductWhereInput['OR'];
  }

  if (categoryId && categoryId !== 'ALL') {
    where.categoryId = Number(categoryId);
  }

  if (productType && productType !== 'ALL') {
    where.productType = productType as ProductTypeValue;
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          code: true,
          name: true,
          productType: true,
          unit: true,
          categoryId: true,
          defaultPurchasePrice: true,
          defaultSellingPrice: true,
          barcode: true,
          imageUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          stockBalance: {
            select: { quantityOnHand: true, reservedQuantity: true, averageCost: true }
          },
          category: {
            select: { id: true, name: true, slug: true }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      total,
      totalPages: Math.max(1, Math.ceil(total / take)),
      page: Math.min(page, Math.max(1, Math.ceil(total / take)))
    };
  } catch {
    return {
      products: [],
      total: 0,
      totalPages: 1,
      page: 1
    };
  }
}

export async function getProductById(productId: number) {
  await requireUser();
  if (!Number.isInteger(productId) || productId < 1) return null;

  return prisma.product.findFirst({
    where: { id: productId, isArchived: false },
    select: {
      id: true, code: true, name: true, productType: true, unit: true, categoryId: true,
      defaultPurchasePrice: true, defaultSellingPrice: true, barcode: true, imageUrl: true,
      lowStockThreshold: true, isActive: true, createdAt: true, updatedAt: true,
      stockBalance: { select: { quantityOnHand: true, reservedQuantity: true, averageCost: true } },
      category: { select: { id: true, name: true, slug: true } }
    }
  });
}

export async function getProductStats() {
  try {
    const [total, active, lowStock] = await Promise.all([
      prisma.product.count({ where: { isArchived: false } }),
      prisma.product.count({ where: { isActive: true, isArchived: false } }),
      prisma.product.count({ where: { isArchived: false, lowStockThreshold: { gt: 0 }, stockBalance: { quantityOnHand: { lte: 0 } } } })
    ]);

    return { total, active, lowStock };
  } catch {
    return { total: 0, active: 0, lowStock: 0 };
  }
}

export async function getProductCategories() {
  return prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  });
}
