
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deleteStockItem(itemId) {
  console.log('deleteStockItem called with itemId:', itemId);

  try {
    const deleteResult = await prisma.product.delete({
      where: { id: itemId },
    });
    console.log('prisma.product.delete result:', deleteResult);

    return { success: true, message: 'Stock item deleted successfully.' };
  } catch (error) {
    console.error('Failed to delete stock item:', error);
    return { success: false, message: 'Failed to delete stock item.' };
  }
}

async function main() {
  await prisma.$connect();
  const result = await deleteStockItem(32);
  console.log(result);
}

main().finally(async () => {
  await prisma.$disconnect();
});
