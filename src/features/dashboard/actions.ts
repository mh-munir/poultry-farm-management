import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';
import { CACHE_TAGS } from '@/lib/cache';

type DashboardDataArgs = { start: Date; end: Date; sixMonthsAgo: Date };

export const getDashboardDataCached = unstable_cache(
  async ({ start, end, sixMonthsAgo }: DashboardDataArgs) => {
    // Consolidated summary aggregates (single row)
    const [summaryRow] = await prisma.$queryRaw<Array<any>>`
      SELECT
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'SALE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'FEED' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId" WHERE tr."transactionType" IN ('SALE','PURCHASE')
        ), 0) AS "daily_feed_sale",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'SALE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'MEDICINE' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId" WHERE tr."transactionType" IN ('SALE','PURCHASE')
        ), 0) AS "daily_medicine_sale",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'FEED' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId" WHERE tr."transactionType" IN ('SALE','PURCHASE')
        ), 0) AS "daily_feed_purchase",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'MEDICINE' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId" WHERE tr."transactionType" IN ('SALE','PURCHASE')
        ), 0) AS "daily_medicine_purchase",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'CHICKEN' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId" WHERE tr."transactionType" IN ('SALE','PURCHASE')
        ), 0) AS "daily_chicken_purchase",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'EGG' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId" WHERE tr."transactionType" IN ('SALE','PURCHASE')
        ), 0) AS "daily_egg_purchase",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'SALE' AND p."productType" = 'FEED' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId"
        ), 0) AS "total_feed_sale",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'SALE' AND p."productType" = 'MEDICINE' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId"
        ), 0) AS "total_medicine_sale",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND p."productType" = 'FEED' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId"
        ), 0) AS "total_feed_purchase",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND p."productType" = 'MEDICINE' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId"
        ), 0) AS "total_medicine_purchase",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND p."productType" = 'CHICKEN' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId"
        ), 0) AS "total_chicken_purchase",
        COALESCE((
          SELECT SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND p."productType" = 'EGG' THEN ti."lineTotal" ELSE 0 END)
          FROM "TransactionItem" ti JOIN "Transaction" tr ON tr.id = ti."transactionId" JOIN "Product" p ON p.id = ti."productId"
        ), 0) AS "total_egg_purchase",
        COALESCE((
          SELECT SUM(CASE WHEN t."transactionType" = 'SALE' AND t."dueAmount" > 0 THEN t."dueAmount" ELSE 0 END) FROM "Transaction" t WHERE t."transactionType" IN ('SALE','PURCHASE')
        ), 0) AS "total_customer_due",
        COALESCE((
          SELECT SUM(CASE WHEN t."transactionType" = 'PURCHASE' AND t."dueAmount" > 0 AND EXISTS(SELECT 1 FROM "TransactionItem" ti JOIN "Product" p ON p.id = ti."productId" WHERE ti."transactionId" = t.id AND p."productType" IN ('FEED','MEDICINE')) THEN t."dueAmount" ELSE 0 END) FROM "Transaction" t
        ), 0) AS "total_feed_medicine_due",
        COALESCE((
          SELECT SUM(CASE WHEN t."transactionType" = 'PURCHASE' AND t."dueAmount" > 0 AND EXISTS(SELECT 1 FROM "TransactionItem" ti JOIN "Product" p ON p.id = ti."productId" WHERE ti."transactionId" = t.id AND p."productType" IN ('EGG','CHICKEN')) THEN t."dueAmount" ELSE 0 END) FROM "Transaction" t
        ), 0) AS "total_egg_chicken_due",
        COALESCE((SELECT SUM(CASE WHEN "expenseDate" >= ${start} AND "expenseDate" < ${end} THEN amount ELSE 0 END) FROM "Expense"), 0) AS "daily_expense",
        COALESCE((SELECT SUM(amount) FROM "Expense"), 0) AS "total_expense",
        COALESCE((SELECT SUM(CASE WHEN "paymentDate" >= ${start} AND "paymentDate" < ${end} THEN amount ELSE 0 END) FROM "Payment"), 0) AS "daily_party_payment",
        COALESCE((SELECT SUM(amount) FROM "Payment"), 0) AS "total_party_payment"
    `;

    // Heavier datasets in parallel
    // Note: Postgres returns dates as strings via $queryRaw; use `string` here and
    // convert to `Date` immediately after fetching to preserve runtime types.
    const [expenseMonthlyGroupsRaw, stockBalances, recentTransactions, monthlyRevenueRowsRaw, monthlyPurchaseRowsRaw] = await Promise.all([
      prisma.$queryRaw<Array<{ month: string; total: Prisma.Decimal | null }>>`
        SELECT date_trunc('month', "expenseDate") AS month, SUM(amount) AS total
        FROM "Expense"
        WHERE "expenseDate" >= ${sixMonthsAgo}
        GROUP BY month
        ORDER BY month
      `,
      prisma.stockBalance.findMany({ select: { quantityOnHand: true, averageCost: true } }),
      prisma.transaction.findMany({
        take: 5,
        orderBy: { transactionDate: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          party: { select: { name: true } },
          company: { select: { name: true } },
          totalAmount: true,
          status: true,
          transactionType: true
        }
      }),
      prisma.$queryRaw<Array<{ month: string; total: Prisma.Decimal | null }>>`
        SELECT date_trunc('month', tr."transactionDate") AS month, SUM(ti."lineTotal") AS total
        FROM "TransactionItem" ti
        JOIN "Transaction" tr ON tr.id = ti."transactionId"
        WHERE tr."transactionType" = 'SALE'
          AND tr."transactionDate" >= ${sixMonthsAgo}
        GROUP BY month
        ORDER BY month
      `,
      prisma.$queryRaw<Array<{ month: string; total: Prisma.Decimal | null }>>`
        SELECT date_trunc('month', "transactionDate") AS month, SUM("totalAmount") AS total
        FROM "Transaction"
        WHERE "transactionType" = 'PURCHASE'
          AND "transactionDate" >= ${sixMonthsAgo}
        GROUP BY month
        ORDER BY month
      `
    ]);

    // Normalize month fields to real Date objects (preserves behaviour used by the dashboard)
    const expenseMonthlyGroups = (expenseMonthlyGroupsRaw as Array<{ month: string; total: Prisma.Decimal | null }>).map((r) => ({
      ...r,
      month: new Date(r.month)
    }));

    const monthlyRevenueRows = (monthlyRevenueRowsRaw as Array<{ month: string; total: Prisma.Decimal | null }>).map((r) => ({
      ...r,
      month: new Date(r.month)
    }));

    const monthlyPurchaseRows = (monthlyPurchaseRowsRaw as Array<{ month: string; total: Prisma.Decimal | null }>).map((r) => ({
      ...r,
      month: new Date(r.month)
    }));

    return { summaryRow, expenseMonthlyGroups, stockBalances, recentTransactions, monthlyRevenueRows, monthlyPurchaseRows };
  },
  ['dashboard-data'],
  { tags: [CACHE_TAGS.dashboard], revalidate: 30 }
);

export default getDashboardDataCached;
