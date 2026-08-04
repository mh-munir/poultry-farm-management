'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { revalidateStockData } from '@/lib/cache';

export async function getStockItemsByType(productType: 'FEED' | 'MEDICINE') {
  return prisma.product.findMany({
    where: { isActive: true, isArchived: false, productType },
    select: {
      id: true,
      name: true,
      unit: true,
      productType: true,
      defaultPurchasePrice: true,
      defaultSellingPrice: true,
      lowStockThreshold: true,
      company: { select: { id: true, name: true } },
      stockBalance: { select: { quantityOnHand: true } },
      transactionItems: {
        select: {
          transaction: {
            select: {
              id: true,
              transactionDate: true,
              paidAmount: true,
              dueAmount: true,
              party: { select: { name: true } },
              company: { select: { name: true } }
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
    },
    orderBy: { name: 'asc' }
  });
}

export async function updateStockItem(
  itemId: number,
  name: string,
  buyRate: number,
  unit?: string,
  companyId?: number | null,
  quantityOnHand?: number
) {
  await requireUser();

  if (!itemId || !name.trim()) {
    return { success: false as const, message: 'Product name and item id are required.' };
  }

  if (quantityOnHand !== undefined && quantityOnHand < 0) {
    return { success: false as const, message: 'Quantity cannot be negative.' };
  }

  const payload = {
    itemId,
    name: name.trim(),
    buyRate,
    unit: unit?.trim(),
    companyId: companyId ?? null,
    quantityOnHand
  };

  console.log('[updateStockItem] payload', payload);

  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: itemId },
        include: { stockBalance: true }
      });

      if (!product) {
        throw new Error('Product not found.');
      }

      const previousCompanyId = product.companyId ?? null;
      const previousQuantityOnHand = Number(product.stockBalance?.quantityOnHand ?? 0);
      const normalizedCompanyId = companyId !== undefined ? companyId ?? null : previousCompanyId;
      const normalizedUnit = unit !== undefined ? unit.trim() : product.unit;
      const nextPurchasePrice = new Prisma.Decimal(buyRate);
      const productChanged =
        product.name !== payload.name ||
        !new Prisma.Decimal(product.defaultPurchasePrice ?? 0).equals(nextPurchasePrice) ||
        (unit !== undefined && product.unit !== normalizedUnit) ||
        (companyId !== undefined && previousCompanyId !== normalizedCompanyId);

      const quantityChanged = quantityOnHand !== undefined
        ? new Prisma.Decimal(previousQuantityOnHand).comparedTo(new Prisma.Decimal(quantityOnHand)) !== 0
        : false;

      const changed = productChanged || quantityChanged;

      if (quantityOnHand !== undefined) {
        const stockBalanceData = {
          quantityOnHand: new Prisma.Decimal(quantityOnHand)
        };

        if (product.stockBalance) {
          await tx.stockBalance.update({
            where: { productId: itemId },
            data: stockBalanceData
          });
        } else {
          await tx.stockBalance.create({
            data: {
              productId: itemId,
              quantityOnHand: new Prisma.Decimal(quantityOnHand),
              reservedQuantity: new Prisma.Decimal(0),
              averageCost: product.defaultPurchasePrice ?? null
            }
          });
        }
      }

      const updatedProduct = await tx.product.update({
        where: { id: itemId },
        data: {
          name: name.trim(),
          defaultPurchasePrice: nextPurchasePrice,
          ...(unit !== undefined ? { unit: normalizedUnit } : {}),
          ...(companyId !== undefined ? { companyId: normalizedCompanyId } : {})
        },
        include: { company: { select: { name: true } } }
      });

      const readBackProduct = await tx.product.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          unit: true,
          companyId: true,
          defaultPurchasePrice: true,
          defaultSellingPrice: true
        }
      });

      const readBackBalance = await tx.stockBalance.findUnique({
        where: { productId: itemId },
        select: { quantityOnHand: true }
      });

      if (!readBackProduct) {
        throw new Error('Product not found after update.');
      }

      const productMismatch =
        readBackProduct.name !== name.trim() ||
        readBackProduct.companyId !== normalizedCompanyId ||
        (unit !== undefined && readBackProduct.unit !== normalizedUnit) ||
        Number(readBackProduct.defaultPurchasePrice ?? 0) !== buyRate;

      const quantityPersisted = quantityOnHand !== undefined
        ? Number(readBackBalance?.quantityOnHand ?? 0) === quantityOnHand
        : true;

      if (productMismatch || !quantityPersisted) {
        throw new Error('Stock item update did not persist correctly.');
      }

      const previous = {
        name: product.name,
        unit: product.unit,
        companyId: previousCompanyId,
        defaultPurchasePrice: Number(product.defaultPurchasePrice ?? 0),
        quantityOnHand: previousQuantityOnHand
      };

      const actual = {
        name: readBackProduct.name,
        unit: readBackProduct.unit,
        companyId: readBackProduct.companyId,
        defaultPurchasePrice: Number(readBackProduct.defaultPurchasePrice ?? 0),
        quantityOnHand: Number(readBackBalance?.quantityOnHand ?? 0)
      };

      const persisted = !productMismatch && quantityPersisted;

      console.log('[updateStockItem] readback', {
        itemId,
        previous,
        expected: payload,
        actual,
        persisted,
        changed,
        productChanged,
        quantityChanged
      });

      return {
        updatedProduct,
        previousCompanyId,
        changed
      };
    });

    if (!transactionResult.changed) {
      return { success: false as const, message: 'No product changes were applied.' };
    }

    revalidateStockData();
    revalidatePath('/dashboard/companies');

    if (transactionResult.previousCompanyId !== null) {
      revalidatePath(`/dashboard/companies/${transactionResult.previousCompanyId}`);
    }

    if (transactionResult.updatedProduct.companyId !== null) {
      revalidatePath(`/dashboard/companies/${transactionResult.updatedProduct.companyId}`);
    }

    return {
      success: true as const,
      message: 'Stock item updated successfully.',
      item: {
        id: transactionResult.updatedProduct.id,
        name: transactionResult.updatedProduct.name,
        buyRate: Number(transactionResult.updatedProduct.defaultPurchasePrice ?? 0),
        unit: transactionResult.updatedProduct.unit,
        companyName: transactionResult.updatedProduct.company?.name ?? null,
        quantity: quantityOnHand !== undefined ? quantityOnHand : undefined
      }
    };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Failed to update stock item.' };
  }
}

export async function deleteStockItem(itemId: number) {
  console.log('deleteStockItem called with itemId:', itemId);
  await requireUser();

  try {
      const [transactionItemCount, stockMovementCount] = await Promise.all([
        prisma.transactionItem.count({ where: { productId: itemId } }),
        prisma.stockMovement.count({ where: { productId: itemId } })
      ]);

      if (transactionItemCount > 0 || stockMovementCount > 0) {
        return { success: false, message: 'This product cannot be deleted because it has transaction history.' };
      }

      const updateResult = await prisma.product.update({
        where: { id: itemId },
        data: { isArchived: true, deletedAt: new Date() }
      });
      console.log('prisma.product.update result:', updateResult);

      revalidateStockData();

      return { success: true, message: 'Stock item archived successfully.' };
    } catch (error) {
      console.error('Failed to archive stock item:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to archive stock item.' };
    }
}
