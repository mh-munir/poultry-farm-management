import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteMedicineStock() {
  try {
    console.log('Starting deletion of all medicine stock data...');

    // Find all MEDICINE type products
    const medicineProducts = await prisma.product.findMany({
      where: { productType: 'MEDICINE' },
      select: { id: true, name: true }
    });

    console.log(`Found ${medicineProducts.length} medicine products to delete`);

    if (medicineProducts.length === 0) {
      console.log('No medicine products found to delete.');
      await prisma.$disconnect();
      return;
    }

    const productIds = medicineProducts.map(p => p.id);

    // Delete stock movements
    const deletedMovements = await prisma.stockMovement.deleteMany({
      where: { productId: { in: productIds } }
    });
    console.log(`Deleted ${deletedMovements.count} stock movements`);

    // Delete stock balances
    const deletedBalances = await prisma.stockBalance.deleteMany({
      where: { productId: { in: productIds } }
    });
    console.log(`Deleted ${deletedBalances.count} stock balances`);

    // Delete transaction items
    const deletedItems = await prisma.transactionItem.deleteMany({
      where: { productId: { in: productIds } }
    });
    console.log(`Deleted ${deletedItems.count} transaction items`);

    // Delete the products themselves
    const deletedProducts = await prisma.product.deleteMany({
      where: { productType: 'MEDICINE' }
    });
    console.log(`Deleted ${deletedProducts.count} medicine products`);

    console.log('✅ All medicine stock data has been successfully deleted from the database.');
  } catch (error) {
    console.error('❌ Error deleting medicine stock:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteMedicineStock();
