import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const companyId = 64;
    const products = await prisma.product.findMany({
      where: {
        productType: 'MEDICINE',
        isActive: true,
        isArchived: false,
        companyId
      },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        companyId: true,
        stockBalance: true,
        stockMovements: { orderBy: { createdAt: 'asc' }, select: { id: true, transactionId: true, quantity: true, unitCost: true, movementType: true, createdAt: true } },
        transactionItems: { select: { transaction: { select: { id: true, companyId: true, transactionType: true, invoiceNumber: true, transactionDate: true } } } }
      }
    });
    console.log(JSON.stringify({ count: products.length, products }, null, 2));
  } catch (error) {
    console.error('ERROR', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
