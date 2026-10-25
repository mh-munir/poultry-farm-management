'use server';

import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { revalidateInventoryData, revalidateStockItemData } from '@/lib/cache';

export async function getStockItemsByType(productType: 'FEED' | 'MEDICINE' | 'CHICK', companyId?: number) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      isArchived: false,
      productType,
      ...(companyId !== undefined && companyId !== null
        ? {
            OR: [
              { companyId },
              {
                transactionItems: {
                  some: {
                    transaction: {
                      companyId,
                      transactionType: 'PURCHASE'
                    }
                  }
                }
              }
            ]
          }
        : {})
    },
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

  const allowedCompanyTypes: Record<string, readonly string[]> = {
    FEED: ['FEED', 'FEED_CHICK'],
    MEDICINE: ['MEDICINE'],
    CHICK: ['FEED', 'CHICK', 'FEED_CHICK']
  } as const;

  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: itemId },
        include: { stockBalance: true }
      });

      if (!product) {
        throw new Error('Product not found.');
      }

      const normalizedCompanyId = companyId !== undefined ? companyId ?? null : product.companyId ?? null;
      if (normalizedCompanyId !== null) {
        const company = await tx.company.findUnique({
          where: { id: normalizedCompanyId },
          select: { id: true, companyType: true, isActive: true }
        });

        if (!company || !company.isActive) {
          throw new Error('Selected company is not available.');
        }

        const allowedTypes: readonly string[] = allowedCompanyTypes[product.productType] ?? [];
        if (allowedTypes.length > 0 && !allowedTypes.includes(company.companyType)) {
          throw new Error('Selected company is not valid for this product type.');
        }
      }

      const previousCompanyId = product.companyId ?? null;
      const previousQuantityOnHand = Number(product.stockBalance?.quantityOnHand ?? 0);
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
        const nextQuantityOnHand = new Prisma.Decimal(quantityOnHand);
        const stockBalanceData = {
          quantityOnHand: nextQuantityOnHand
        };

        if (product.stockBalance) {
          const adjustmentQuantity = nextQuantityOnHand.minus(new Prisma.Decimal(previousQuantityOnHand));
          await tx.stockBalance.update({
            where: { productId: itemId },
            data: stockBalanceData
          });

          await tx.stockMovement.create({
            data: {
              productId: itemId,
              movementType: 'ADJUSTMENT',
              quantity: adjustmentQuantity,
              unitCost: product.defaultPurchasePrice ?? null,
              notes: 'Manual stock adjustment'
            }
          });
        } else {
          await tx.stockBalance.create({
            data: {
              productId: itemId,
              quantityOnHand: nextQuantityOnHand,
              reservedQuantity: new Prisma.Decimal(0),
              averageCost: product.defaultPurchasePrice ?? null
            }
          });

          await tx.stockMovement.create({
            data: {
              productId: itemId,
              movementType: 'ADJUSTMENT',
              quantity: nextQuantityOnHand,
              unitCost: product.defaultPurchasePrice ?? null,
              notes: 'Initial stock adjustment'
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

      return {
        updatedProduct,
        previousCompanyId,
        changed
      };
    });

    if (!transactionResult.changed) {
      return { success: false as const, message: 'No product changes were applied.' };
    }

    revalidateStockItemData({
      companyIds: [transactionResult.previousCompanyId, transactionResult.updatedProduct.companyId]
        .filter((id): id is number => id !== null)
    });

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

export async function deleteStockItem(itemId: number, deleteHistory = false) {
  await requireUser();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: itemId },
        select: { id: true, productType: true, companyId: true, stockBalance: { select: { id: true } } }
      });

      if (!product) {
        throw new Error('Stock item not found.');
      }

      if (deleteHistory && product.productType !== 'FEED' && product.productType !== 'MEDICINE') {
        throw new Error('Deleting history is only supported for feed and medicine products.');
      }

      const transactions = deleteHistory
        ? await tx.transaction.findMany({
            where: { transactionItems: { some: { productId: itemId } } },
            select: {
              id: true,
              partyId: true,
              companyId: true,
              status: true,
              stockMovements: {
                select: { productId: true, movementType: true, quantity: true, unitCost: true }
              }
            }
          })
        : [];
      const transactionIds = transactions.map((transaction) => transaction.id);

      const transactionItemCount = await tx.transactionItem.count({ where: { productId: itemId } });
      const stockMovementCount = await tx.stockMovement.count({ where: { productId: itemId } });

      if (!deleteHistory && (transactionItemCount > 0 || stockMovementCount > 0)) {
        throw new Error('This product cannot be deleted because it has transaction history.');
      }

      if (!deleteHistory) {
        await tx.product.update({
          where: { id: itemId },
          data: { isArchived: true, deletedAt: new Date() }
        });
        return { companyIds: [], partyIds: [], archived: true, stockAdjustmentWasLimited: false };
      }

      const transactionIdSet = new Set(transactionIds);
      const allocations = transactionIds.length > 0
        ? await tx.paymentAllocation.findMany({
            where: { transactionId: { in: transactionIds } },
            select: {
              paymentId: true,
              payment: { select: { allocations: { select: { transactionId: true } } } }
            }
          })
        : [];

      if (allocations.some((allocation) =>
        allocation.payment.allocations.some((paymentAllocation) => !transactionIdSet.has(paymentAllocation.transactionId))
      )) {
        throw new Error('This product has invoices linked to a payment shared with other invoices. Update the payment allocation before deleting this product.');
      }

      const paymentIds = [...new Set(allocations.map((allocation) => allocation.paymentId))];
      const stockChanges = new Map<number, { quantity: Prisma.Decimal; unitCost: Prisma.Decimal | null }>();
      const purchasedProductIds = new Set<number>();
      let stockAdjustmentWasLimited = false;

      for (const transaction of transactions) {
        if (transaction.status === 'CANCELLED') continue;
        for (const movement of transaction.stockMovements) {
          if (movement.productId === itemId) continue;
          let change: Prisma.Decimal;
          if (movement.movementType === 'SALE') {
            change = new Prisma.Decimal(movement.quantity);
          } else if (movement.movementType === 'PURCHASE') {
            change = new Prisma.Decimal(movement.quantity).negated();
            purchasedProductIds.add(movement.productId);
          } else {
            throw new Error('A related invoice has an unsupported stock movement. Resolve it before deleting this product.');
          }

          const previous = stockChanges.get(movement.productId);
          stockChanges.set(movement.productId, {
            quantity: (previous?.quantity ?? new Prisma.Decimal(0)).plus(change),
            unitCost: movement.unitCost ?? previous?.unitCost ?? null
          });
        }
      }

      for (const [productId, change] of stockChanges) {
        const balance = await tx.stockBalance.findUnique({ where: { productId } });
        let nextQuantity = new Prisma.Decimal(balance?.quantityOnHand ?? 0).plus(change.quantity);
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
              averageCost: change.unitCost
            }
          });
        }
      }

      for (const productId of purchasedProductIds) {
        const remainingPurchases = await tx.stockMovement.findMany({
          where: {
            productId,
            movementType: 'PURCHASE',
            transaction: {
              status: { not: 'CANCELLED' },
              id: { notIn: transactionIds }
            }
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

      if (transactionIds.length > 0) {
        await tx.smsNotification.deleteMany({ where: { transactionId: { in: transactionIds } } });
        await tx.ledgerEntry.deleteMany({
          where: {
            OR: [
              { transactionId: { in: transactionIds } },
              ...(paymentIds.length > 0 ? [{ paymentId: { in: paymentIds } }] : [])
            ]
          }
        });
        await tx.dueAdjustment.deleteMany({ where: { transactionId: { in: transactionIds } } });
        await tx.stockMovement.deleteMany({
          where: { OR: [{ productId: itemId }, { transactionId: { in: transactionIds } }] }
        });
        await tx.paymentAllocation.deleteMany({ where: { transactionId: { in: transactionIds } } });
        if (paymentIds.length > 0) {
          await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
        }
        await tx.transactionItem.deleteMany({ where: { transactionId: { in: transactionIds } } });
        await tx.transaction.deleteMany({ where: { id: { in: transactionIds } } });
      } else {
        await tx.stockMovement.deleteMany({ where: { productId: itemId } });
      }

      await tx.stockBalance.deleteMany({ where: { productId: itemId } });
      await tx.product.delete({ where: { id: itemId } });

      return {
        companyIds: [...new Set([
          product.companyId,
          ...transactions.map((transaction) => transaction.companyId)
        ].filter((id): id is number => id !== null))],
        partyIds: [...new Set(transactions.map((transaction) => transaction.partyId).filter((id): id is number => id !== null))],
        archived: false,
        stockAdjustmentWasLimited
      };
    }, { maxWait: 10_000, timeout: 30_000 });

    revalidateInventoryData({ companyIds: result.companyIds, partyIds: result.partyIds });

    return {
      success: true,
      message: result.archived
        ? 'Stock item archived successfully.'
        : `Stock item and all related transaction history deleted successfully.${result.stockAdjustmentWasLimited ? ' Some affected stock had already been used, so the remaining balance was adjusted to zero instead of becoming negative.' : ''}`
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete stock item.' };
  }
}
