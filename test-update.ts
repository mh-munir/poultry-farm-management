import { prisma } from './src/server/db';
import { Prisma } from '@prisma/client';

async function updateStockItem(itemId: number, name: string, buyRate: number, salesRate: number, unit?: string, companyId?: number | null, quantityOnHand?: number) {
  if (!itemId || !name.trim()) {
    return { success: false as const, message: 'Product name and item id are required.' };
  }

  if (quantityOnHand !== undefined && quantityOnHand < 0) {
    return { success: false as const, message: 'Quantity cannot be negative.' };
  }

  try {
    const updatedProduct = await (prisma as any).$transaction(async (tx: any) => {
      const product = await tx.product.findUnique({
        where: { id: itemId },
        include: { stockBalance: true }
      });

      if (!product) {
        throw new Error('Product not found.');
      }

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

      return tx.product.update({
        where: { id: itemId },
        data: {
          name: name.trim(),
          defaultPurchasePrice: new Prisma.Decimal(buyRate),
          defaultSellingPrice: new Prisma.Decimal(salesRate),
          ...(unit !== undefined ? { unit: unit.trim() } : {}),
          ...(companyId !== undefined ? { companyId: companyId ?? null } : {})
        },
        include: { company: { select: { name: true } } }
      });
    });

    console.log('Transaction succeeded');
    console.log('Updated product name:', updatedProduct.name);

    return {
      success: true as const,
      message: 'Stock item updated successfully.',
      item: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        buyRate: Number(updatedProduct.defaultPurchasePrice ?? 0),
        salesRate: Number(updatedProduct.defaultSellingPrice ?? 0),
        unit: updatedProduct.unit,
        companyName: updatedProduct.company?.name ?? null,
        quantity: quantityOnHand !== undefined ? quantityOnHand : undefined
      }
    };
  } catch (error) {
    console.error('Transaction failed:', error);
    return { success: false as const, message: error instanceof Error ? error.message : 'Failed to update stock item.' };
  }
}

const result = await updateStockItem(28, 'New Medicine Name', 100, 200, 'gm', null, 50);
console.log('Result:', JSON.stringify(result, null, 2));

const check = await prisma.product.findUnique({ where: { id: 28 }, select: { id: true, name: true } });
console.log('After update:', JSON.stringify(check, null, 2));
