import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const product = await prisma.product.findUnique({
      where: { id: 90 },
      include: {
        company: true,
        stockBalance: true,
        transactionItems: {
          include: {
            transaction: {
              include: {
                company: true,
                party: true,
              }
            }
          }
        }
      }
    });
    console.log('PRODUCT', JSON.stringify(product, null, 2));

    const txItems = await prisma.transactionItem.findMany({
      where: { productId: 90 },
      include: {
        transaction: {
          include: {
            company: true,
            party: true
          }
        }
      }
    });
    console.log('TRANSACTION_ITEMS', JSON.stringify(txItems, null, 2));

    const txIds = [...new Set(txItems.map((item) => item.transactionId))];
    const transactions = await prisma.transaction.findMany({
      where: { id: { in: txIds } },
      include: {
        company: true,
        party: true,
        transactionItems: {
          include: { product: true }
        }
      }
    });
    console.log('TRANSACTIONS', JSON.stringify(transactions, null, 2));

    const products = await prisma.product.findMany({
      where: { name: 'test medicine' },
      include: { stockBalance: true, company: true }
    });
    console.log('PRODUCTS_BY_NAME', JSON.stringify(products, null, 2));

    const stockBalances = await prisma.stockBalance.findMany({
      where: { productId: { in: products.map((p) => p.id) } }
    });
    console.log('STOCK_BALANCES', JSON.stringify(stockBalances, null, 2));
  } catch (error) {
    console.error('ERROR', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
