import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0,0,0,0);
    const sixMonthsAgo = new Date(start);
    sixMonthsAgo.setMonth(start.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);

    console.log('sixMonthsAgo:', sixMonthsAgo.toISOString());

    const monthlyRevenueRows = await prisma.$queryRaw`
      SELECT date_trunc('month', tr."transactionDate") AS month, SUM(ti."lineTotal") AS total
      FROM "TransactionItem" ti
      JOIN "Transaction" tr ON tr.id = ti."transactionId"
      WHERE tr."transactionType" = 'SALE'
        AND tr."transactionDate" >= ${sixMonthsAgo}
      GROUP BY month
      ORDER BY month
    `;

    console.log('monthlyRevenueRows (raw):');
    console.log(monthlyRevenueRows);

    const monthlyPurchaseRows = await prisma.$queryRaw`
      SELECT date_trunc('month', "transactionDate") AS month, SUM("totalAmount") AS total
      FROM "Transaction"
      WHERE "transactionType" = 'PURCHASE'
        AND "transactionDate" >= ${sixMonthsAgo}
      GROUP BY month
      ORDER BY month
    `;

    console.log('monthlyPurchaseRows (raw):');
    console.log(monthlyPurchaseRows);
  } catch (err) {
    console.error('ERROR', err);
  } finally {
    await prisma.$disconnect();
  }
})();
