import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const medicines = await prisma.product.findMany({
      where: { productType: 'MEDICINE' },
      select: { id: true, name: true, code: true, unit: true, companyId: true, stockBalance: true }
    });
    console.log('MEDICINE COUNT', medicines.length);
    console.log(JSON.stringify(medicines.slice(0, 50), null, 2));

    const balances = await prisma.stockBalance.findMany({
      take: 50,
      orderBy: { productId: 'asc' },
      select: { id: true, productId: true, quantityOnHand: true, averageCost: true }
    });
    console.log('STOCK BALANCE COUNT', balances.length);
    console.log(JSON.stringify(balances.slice(0, 50), null, 2));

    const txItems = await prisma.transactionItem.findMany({
      where: { product: { productType: 'MEDICINE' } },
      take: 50,
      orderBy: { id: 'asc' },
      select: { id: true, transactionId: true, productId: true, quantity: true, unitPrice: true }
    });
    console.log('MEDICINE TRANSACTION ITEMS COUNT', txItems.length);
    console.log(JSON.stringify(txItems.slice(0, 50), null, 2));

    const meds100 = await prisma.product.findMany({
      where: { name: { contains: 'test medicine' }, unit: { contains: '100' } },
      select: { id: true, name: true, unit: true, code: true, companyId: true, stockBalance: true }
    });
    console.log('TEST MEDICINE 100', JSON.stringify(meds100, null, 2));

    const meds200 = await prisma.product.findMany({
      where: { name: { contains: 'test medicine' }, unit: { contains: '200' } },
      select: { id: true, name: true, unit: true, code: true, companyId: true, stockBalance: true }
    });
    console.log('TEST MEDICINE 200', JSON.stringify(meds200, null, 2));
  } catch (error) {
    console.error('ERROR', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
