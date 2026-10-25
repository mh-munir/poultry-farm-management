import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';
import { CACHE_TAGS } from '@/lib/cache';
import { getPartyFinancialSummary } from '@/features/parties/accounting';


export type ProfitSummary = {
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
};

export type TopProductRow = {
  productId: number;
  productName: string;
  productType: string;
  quantitySold: number;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
};

export type ProfitTrendPoint = {
  bucket: string;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
};

export type ProfitAnalyticsData = {
  summary: ProfitSummary;
  pieChart: { profit: number; cost: number };
  topProducts: TopProductRow[];
  trendSeries: ProfitTrendPoint[];
  unavailable?: boolean;
};

export const EMPTY_PROFIT_ANALYTICS: ProfitAnalyticsData = {
  summary: { totalSales: 0, totalCost: 0, grossProfit: 0, profitMargin: 0 },
  pieChart: { profit: 0, cost: 0 },
  topProducts: [],
  trendSeries: [],
  unavailable: false,
};

export type DashboardBalanceSummary = {
  companiesPayable: number;
  partiesReceivable: number;
  partySuppliersPayable: number;
};

export const EMPTY_DASHBOARD_BALANCES: DashboardBalanceSummary = {
  companiesPayable: 0,
  partiesReceivable: 0,
  partySuppliersPayable: 0,
};

export const getDashboardBalanceSummary = unstable_cache(
  async (): Promise<DashboardBalanceSummary> => {
    const [companyRows, partySupplierRows, parties] = await Promise.all([
      prisma.$queryRaw<Array<{ companies_payable: Prisma.Decimal | null }>>`
        SELECT COALESCE(SUM(GREATEST(
          c."openingBalance" + COALESCE(purchases.total_amount, 0) - COALESCE(payments.total_amount, 0),
          0
        )), 0) AS companies_payable
        FROM "Company" c
        LEFT JOIN (
          SELECT "companyId", SUM("totalAmount") AS total_amount
          FROM "Transaction"
          WHERE "transactionType" = 'PURCHASE' AND "status" <> 'CANCELLED'
          GROUP BY "companyId"
        ) purchases ON purchases."companyId" = c.id
        LEFT JOIN (
          SELECT "companyId", SUM("amount") AS total_amount
          FROM "Payment"
          WHERE "status" <> 'CANCELLED'
          GROUP BY "companyId"
        ) payments ON payments."companyId" = c.id
        WHERE c."companyType" IN ('FEED', 'MEDICINE', 'CHICK', 'FEED_CHICK')
      `,
      prisma.$queryRaw<Array<{ party_suppliers_payable: Prisma.Decimal | null }>>`
        SELECT COALESCE(SUM(
          CASE
            WHEN tr."subtotal" > 0
            THEN tr."dueAmount" * category_totals.target_subtotal / tr."subtotal"
            ELSE 0
          END
        ), 0) AS party_suppliers_payable
        FROM "Transaction" tr
        JOIN (
          SELECT ti."transactionId", SUM(ti."lineTotal") AS target_subtotal
          FROM "TransactionItem" ti
          JOIN "Product" p ON p.id = ti."productId"
          WHERE p."productType" IN ('CHICKEN', 'EGG')
          GROUP BY ti."transactionId"
        ) category_totals ON category_totals."transactionId" = tr.id
        WHERE tr."transactionType" = 'PURCHASE'
          AND tr."status" IN ('PENDING', 'COMPLETED')
          AND tr."partyId" IS NOT NULL
      `,
      prisma.party.findMany({ select: { id: true } }),
    ]);

    const partySummaries = await Promise.all(
      parties.map((party) => getPartyFinancialSummary(party.id)),
    );
    const partiesReceivable = partySummaries.reduce(
      (total, summary) => total.plus(summary.customerDue),
      new Prisma.Decimal(0),
    );

    return {
      companiesPayable: Number(companyRows[0]?.companies_payable ?? 0),
      partiesReceivable: partiesReceivable.toNumber(),
      partySuppliersPayable: Number(partySupplierRows[0]?.party_suppliers_payable ?? 0),
    };
  },
  ['dashboard-balance-summary'],
  { tags: [CACHE_TAGS.dashboard], revalidate: 30 },
);

export async function getProfitAnalytics({ start, end }: { start?: Date; end?: Date } = {}): Promise<ProfitAnalyticsData> {
  try {
    const dateFilter = start && end
      ? Prisma.sql` AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end}`
      : Prisma.empty;

    // Summary aggregates: compute using transaction items joined with latest purchase unitCost per product before sale date
     const [summaryRow] = await prisma.$queryRaw<Array<{ total_sales: Prisma.Decimal | null; total_cost: Prisma.Decimal | null; gross_profit: Prisma.Decimal | null }>>`
     SELECT
       COALESCE(SUM(ti."lineTotal" * (1 - CASE WHEN tr."subtotal" > 0 THEN tr."discount" / tr."subtotal" ELSE 0 END)), 0) AS total_sales,
       COALESCE(SUM(ti."quantity" * COALESCE(sm_sale."unitCost", sm_purchase."unitCost", p."defaultPurchasePrice", 0)), 0) AS total_cost,
       COALESCE(SUM((ti."lineTotal" * (1 - CASE WHEN tr."subtotal" > 0 THEN tr."discount" / tr."subtotal" ELSE 0 END)) - (ti."quantity" * COALESCE(sm_sale."unitCost", sm_purchase."unitCost", p."defaultPurchasePrice", 0))), 0) AS gross_profit
     FROM "TransactionItem" ti
     JOIN "Transaction" tr ON tr.id = ti."transactionId"
     JOIN "Product" p ON p.id = ti."productId"
     LEFT JOIN LATERAL (
       SELECT sm."unitCost" FROM "StockMovement" sm
       WHERE sm."productId" = ti."productId"
         AND sm."transactionId" = ti."transactionId"
         AND sm."movementType" = 'SALE'
       LIMIT 1
     ) sm_sale ON true
     LEFT JOIN LATERAL (
       SELECT sm."unitCost" FROM "StockMovement" sm
       WHERE sm."productId" = ti."productId"
         AND sm."movementType" = 'PURCHASE'
         AND sm."createdAt" <= tr."transactionDate"
       ORDER BY sm."createdAt" DESC
       LIMIT 1
     ) sm_purchase ON true
     WHERE tr."transactionType" = 'SALE' AND tr."status" <> 'CANCELLED'
       ${dateFilter}
   `;

  const totalSales = Number(summaryRow?.total_sales ?? 0);
  const totalCost = Number(summaryRow?.total_cost ?? 0);
  const grossProfit = Number(summaryRow?.gross_profit ?? 0);
  const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  // Top products by gross profit (top 10)
   const topRows = await prisma.$queryRaw<Array<{
     product_id: number | null;
     product_name: string | null;
     product_type: string | null;
     quantity_sold: Prisma.Decimal | null;
     total_sales: Prisma.Decimal | null;
     total_cost: Prisma.Decimal | null;
     gross_profit: Prisma.Decimal | null;
   }>>`
     SELECT
       p.id AS product_id,
       p.name AS product_name,
       p."productType" AS product_type,
       COALESCE(SUM(ti."quantity"), 0) AS quantity_sold,
       COALESCE(SUM(ti."lineTotal" * (1 - CASE WHEN tr."subtotal" > 0 THEN tr."discount" / tr."subtotal" ELSE 0 END)), 0) AS total_sales,
       COALESCE(SUM(ti."quantity" * COALESCE(sm_sale."unitCost", sm_purchase."unitCost", p."defaultPurchasePrice", 0)), 0) AS total_cost,
       COALESCE(SUM((ti."lineTotal" * (1 - CASE WHEN tr."subtotal" > 0 THEN tr."discount" / tr."subtotal" ELSE 0 END)) - (ti."quantity" * COALESCE(sm_sale."unitCost", sm_purchase."unitCost", p."defaultPurchasePrice", 0))), 0) AS gross_profit
     FROM "TransactionItem" ti
     JOIN "Transaction" tr ON tr.id = ti."transactionId"
     JOIN "Product" p ON p.id = ti."productId"
     LEFT JOIN LATERAL (
       SELECT sm."unitCost" FROM "StockMovement" sm
       WHERE sm."productId" = ti."productId" 
         AND sm."transactionId" = ti."transactionId"
         AND sm."movementType" = 'SALE'
       LIMIT 1
     ) sm_sale ON true
     LEFT JOIN LATERAL (
       SELECT sm."unitCost" FROM "StockMovement" sm
       WHERE sm."productId" = ti."productId" 
         AND sm."movementType" = 'PURCHASE'
         AND sm."createdAt" <= tr."transactionDate"
       ORDER BY sm."createdAt" DESC
       LIMIT 1
     ) sm_purchase ON true
     WHERE tr."transactionType" = 'SALE' AND tr."status" <> 'CANCELLED' ${dateFilter}
     GROUP BY p.id, p.name, p."productType"
     ORDER BY gross_profit DESC
     LIMIT 10
   `;

  const topProducts: TopProductRow[] = topRows.map((r) => {
    const totalSales = Number(r.total_sales ?? 0);
    const totalCost = Number(r.total_cost ?? 0);
    const grossProfit = Number(r.gross_profit ?? 0);
    return {
      productId: Number(r.product_id ?? 0),
      productName: String(r.product_name ?? ''),
      productType: String(r.product_type ?? ''),
      quantitySold: Number(r.quantity_sold ?? 0),
      totalSales,
      totalCost,
      grossProfit,
      profitMargin: totalSales > 0 ? (grossProfit / totalSales) * 100 : 0
    };
  });

  const trendBucket = start && end && end.getTime() - start.getTime() <= 31 * 24 * 60 * 60 * 1000
    ? 'day'
    : 'month';
  const trendRows = await prisma.$queryRaw<Array<{
    bucket: Date | string;
    total_sales: Prisma.Decimal | null;
    total_cost: Prisma.Decimal | null;
    gross_profit: Prisma.Decimal | null;
  }>>`
    SELECT
      date_trunc(${trendBucket}, tr."transactionDate") AS bucket,
      COALESCE(SUM(
        ti."lineTotal" * (1 - CASE WHEN tr."subtotal" > 0 THEN tr."discount" / tr."subtotal" ELSE 0 END)
      ), 0) AS total_sales,
      COALESCE(SUM(
        ti."quantity" * COALESCE(sm_sale."unitCost", sm_purchase."unitCost", p."defaultPurchasePrice", 0)
      ), 0) AS total_cost,
      COALESCE(SUM(
        (ti."lineTotal" * (1 - CASE WHEN tr."subtotal" > 0 THEN tr."discount" / tr."subtotal" ELSE 0 END))
        - (ti."quantity" * COALESCE(sm_sale."unitCost", sm_purchase."unitCost", p."defaultPurchasePrice", 0))
      ), 0) AS gross_profit
    FROM "TransactionItem" ti
    JOIN "Transaction" tr ON tr.id = ti."transactionId"
    JOIN "Product" p ON p.id = ti."productId"
    LEFT JOIN LATERAL (
      SELECT sm."unitCost"
      FROM "StockMovement" sm
      WHERE sm."productId" = ti."productId"
        AND sm."transactionId" = ti."transactionId"
        AND sm."movementType" = 'SALE'
      LIMIT 1
    ) sm_sale ON true
    LEFT JOIN LATERAL (
      SELECT sm."unitCost"
      FROM "StockMovement" sm
      WHERE sm."productId" = ti."productId"
        AND sm."movementType" = 'PURCHASE'
        AND sm."createdAt" <= tr."transactionDate"
      ORDER BY sm."createdAt" DESC
      LIMIT 1
    ) sm_purchase ON true
    WHERE tr."transactionType" = 'SALE'
      AND tr."status" <> 'CANCELLED'
      ${dateFilter}
    GROUP BY bucket
    ORDER BY bucket
  `;

  return {
    summary: {
      totalSales,
      totalCost,
      grossProfit,
      profitMargin
    },
    pieChart: {
      profit: grossProfit,
      cost: totalCost
    },
    topProducts,
    trendSeries: trendRows.map((row) => ({
      bucket: (row.bucket instanceof Date ? row.bucket : new Date(row.bucket)).toISOString(),
      totalSales: Number(row.total_sales ?? 0),
      totalCost: Number(row.total_cost ?? 0),
      grossProfit: Number(row.gross_profit ?? 0),
    }))
  } as const;
  } catch (err) {
    console.error('Failed to load profit analytics', err);
    return { ...EMPTY_PROFIT_ANALYTICS, unavailable: true };
  }
}
