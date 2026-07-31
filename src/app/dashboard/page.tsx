import {
  ShoppingCart,
  Box,
  BarChart3,
  Wallet,
  DollarSign,
  Layers,
  ClipboardList
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { QueryProfiler } from '@/lib/profiler';
import { dbQuery, prisma } from '@/server/db';
import { Card } from '@/components/ui/card';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { ServiceUnavailableCard } from '@/components/ui/service-unavailable-card';

const BANGLADESH_OFFSET = 6 * 60;

function toBangladeshTime(date: Date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + BANGLADESH_OFFSET * 60000);
}

function getStartOfDay(date: Date) {
  const bd = toBangladeshTime(date);
  bd.setHours(0, 0, 0, 0);
  return bd;
}

function getEndOfDay(date: Date) {
  const start = getStartOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return end;
}

function getTodayRange() {
  const now = new Date();
  const start = getStartOfDay(now);
  const end = getEndOfDay(now);
  return { start, end };
}

function normalizeDashboardDate(date: Date | null | undefined) {
  if (!date) return null;
  return toBangladeshTime(new Date(date));
}

function formatCurrency(value: number) {
  return `৳ ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value);
}

function polarToCartesian(cx: number, cy: number, r: number, angleDegrees: number) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRadians),
    y: cy + r * Math.sin(angleRadians)
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', cx, cy,
    'L', start.x.toFixed(2), start.y.toFixed(2),
    'A', r, r, 0, largeArcFlag, 1, end.x.toFixed(2), end.y.toFixed(2),
    'Z'
  ].join(' ');
}

export default async function DashboardPage() {
  const session = await requireUser();
  const userName = session?.user?.name ?? session?.user?.email ?? 'there';

  const { start, end } = getTodayRange();
  const sixMonthsAgo = new Date(start);
  sixMonthsAgo.setMonth(start.getMonth() - 5);

  const months: string[] = [];
  const monthLabels: string[] = [];
  const monthRanges: { start: Date; end: Date }[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    const monthStart = new Date(date);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    months.push(monthStart.toISOString().slice(0, 7));
    monthLabels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }));
    monthRanges.push({ start: monthStart, end: monthEnd });
  }

  const profiler = new QueryProfiler();

  function query<T>(q: Promise<T>, qName: string, qModel: string, qOperation: string): Promise<T> {
    return dbQuery(q, qName, qModel, qOperation, 30000, undefined, profiler);
  }

  let dbUnavailable = false;

  async function safeQuery<T>(q: Promise<T>, fallback: T, qName: string, qModel: string, qOperation: string): Promise<T> {
    const result = await query(q, qName, qModel, qOperation);
    if (result === undefined) {
      dbUnavailable = true;
      return fallback;
    }
    return result as T;
  }

  const [
    transactionItemTotals,
    transactionDueTotals,
    expenseTotals,
    expenseMonthlyGroups,
    paymentTotals,
    stockBalances,
    recentTransactions,
    activePartiesCount,
    openInvoicesCount,
    lowStockAlerts,
    monthlyRevenueRows,
    monthlyPurchaseRows
  ] = await Promise.all([
    query(
      prisma.$queryRaw<
        Array<{
          daily_feed_sale: Prisma.Decimal | null;
          daily_medicine_sale: Prisma.Decimal | null;
          daily_feed_purchase: Prisma.Decimal | null;
          daily_medicine_purchase: Prisma.Decimal | null;
          daily_chicken_purchase: Prisma.Decimal | null;
          daily_egg_purchase: Prisma.Decimal | null;
          total_feed_sale: Prisma.Decimal | null;
          total_medicine_sale: Prisma.Decimal | null;
          total_feed_purchase: Prisma.Decimal | null;
          total_medicine_purchase: Prisma.Decimal | null;
          total_chicken_purchase: Prisma.Decimal | null;
          total_egg_purchase: Prisma.Decimal | null;
        }>
      >`
        SELECT
          SUM(CASE WHEN tr."transactionType" = 'SALE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'FEED' THEN ti."lineTotal" ELSE 0 END) AS "daily_feed_sale",
          SUM(CASE WHEN tr."transactionType" = 'SALE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'MEDICINE' THEN ti."lineTotal" ELSE 0 END) AS "daily_medicine_sale",
          SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'FEED' THEN ti."lineTotal" ELSE 0 END) AS "daily_feed_purchase",
          SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'MEDICINE' THEN ti."lineTotal" ELSE 0 END) AS "daily_medicine_purchase",
          SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'CHICKEN' THEN ti."lineTotal" ELSE 0 END) AS "daily_chicken_purchase",
          SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND tr."transactionDate" >= ${start} AND tr."transactionDate" < ${end} AND p."productType" = 'EGG' THEN ti."lineTotal" ELSE 0 END) AS "daily_egg_purchase",
          SUM(CASE WHEN tr."transactionType" = 'SALE' AND p."productType" = 'FEED' THEN ti."lineTotal" ELSE 0 END) AS "total_feed_sale",
          SUM(CASE WHEN tr."transactionType" = 'SALE' AND p."productType" = 'MEDICINE' THEN ti."lineTotal" ELSE 0 END) AS "total_medicine_sale",
          SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND p."productType" = 'FEED' THEN ti."lineTotal" ELSE 0 END) AS "total_feed_purchase",
          SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND p."productType" = 'MEDICINE' THEN ti."lineTotal" ELSE 0 END) AS "total_medicine_purchase",
          SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND p."productType" = 'CHICKEN' THEN ti."lineTotal" ELSE 0 END) AS "total_chicken_purchase",
          SUM(CASE WHEN tr."transactionType" = 'PURCHASE' AND p."productType" = 'EGG' THEN ti."lineTotal" ELSE 0 END) AS "total_egg_purchase"
        FROM "TransactionItem" ti
        JOIN "Transaction" tr ON tr.id = ti."transactionId"
        JOIN "Product" p ON p.id = ti."productId"
        WHERE tr."transactionType" IN ('SALE', 'PURCHASE')
      `,
      'Dashboard TransactionItem Totals',
      'TransactionItem',
      'aggregate'
    ),
    query(
      prisma.$queryRaw<
        Array<{
          total_customer_due: Prisma.Decimal | null;
          total_feed_medicine_due: Prisma.Decimal | null;
          total_egg_chicken_due: Prisma.Decimal | null;
        }>
      >`
        SELECT
          SUM(CASE WHEN t."transactionType" = 'SALE' AND t."dueAmount" > 0 THEN t."dueAmount" ELSE 0 END) AS "total_customer_due",
          SUM(CASE WHEN t."transactionType" = 'PURCHASE' AND t."dueAmount" > 0 AND EXISTS(
            SELECT 1
            FROM "TransactionItem" ti
            JOIN "Product" p ON p.id = ti."productId"
            WHERE ti."transactionId" = t.id
              AND p."productType" IN ('FEED', 'MEDICINE')
          ) THEN t."dueAmount" ELSE 0 END) AS "total_feed_medicine_due",
          SUM(CASE WHEN t."transactionType" = 'PURCHASE' AND t."dueAmount" > 0 AND EXISTS(
            SELECT 1
            FROM "TransactionItem" ti
            JOIN "Product" p ON p.id = ti."productId"
            WHERE ti."transactionId" = t.id
              AND p."productType" IN ('EGG', 'CHICKEN')
          ) THEN t."dueAmount" ELSE 0 END) AS "total_egg_chicken_due"
        FROM "Transaction" t
        WHERE t."transactionType" IN ('SALE', 'PURCHASE')
          AND t."dueAmount" > 0
      `,
      'Dashboard Transaction Due Totals',
      'Transaction',
      'aggregate'
    ),
    query(
      prisma.$queryRaw<
        Array<{
          daily_expense: Prisma.Decimal | null;
          total_expense: Prisma.Decimal | null;
        }>
      >`
        SELECT
          SUM(CASE WHEN "expenseDate" >= ${start} AND "expenseDate" < ${end} THEN amount ELSE 0 END) AS "daily_expense",
          SUM(amount) AS "total_expense"
        FROM "Expense"
      `,
      'Dashboard Expense Totals',
      'Expense',
      'aggregate'
    ),
    query(
      prisma.$queryRaw<Array<{ month: Date; total: Prisma.Decimal | null }>>`
        SELECT date_trunc('month', "expenseDate") AS month, SUM(amount) AS total
        FROM "Expense"
        WHERE "expenseDate" >= ${sixMonthsAgo}
        GROUP BY month
        ORDER BY month
      `,
      'Dashboard Monthly Expenses',
      'Expense',
      'aggregate'
    ),
    query(
      prisma.$queryRaw<
        Array<{
          daily_party_payment: Prisma.Decimal | null;
          total_party_payment: Prisma.Decimal | null;
        }>
      >`
        SELECT
          SUM(CASE WHEN "paymentDate" >= ${start} AND "paymentDate" < ${end} THEN amount ELSE 0 END) AS "daily_party_payment",
          SUM(amount) AS "total_party_payment"
        FROM "Payment"
      `,
      'Dashboard Payment Totals',
      'Payment',
      'aggregate'
    ),
    safeQuery(
      prisma.stockBalance.findMany({
        select: { quantityOnHand: true, averageCost: true }
      }),
      [] as any[],
      'Dashboard Stock Value',
      'StockBalance',
      'findMany'
    ),
    safeQuery(
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
      [] as any[],
      'Dashboard Recent Transactions',
      'Transaction',
      'findMany'
    ),
    safeQuery(prisma.party.count({ where: { isActive: true } }), 0, 'Dashboard Active Parties', 'Party', 'count'),
    safeQuery(
      prisma.transaction.count({
        where: { transactionType: 'SALE', status: { not: 'COMPLETED' } }
      }),
      0,
      'Dashboard Open Invoices',
      'Transaction',
      'count'
    ),
    safeQuery(
      prisma.product.findMany({
        where: {
          isActive: true,
          lowStockThreshold: { gt: 0 }
        },
        select: {
          id: true,
          name: true,
          lowStockThreshold: true,
          stockBalance: { select: { quantityOnHand: true } }
        }
      }),
      [] as any[],
      'Dashboard Low Stock Alerts',
      'Product',
      'findMany'
    ),
    query(
      prisma.$queryRaw<Array<{ month: Date; total: Prisma.Decimal | null }>>`
        SELECT date_trunc('month', tr."transactionDate") AS month, SUM(ti."lineTotal") AS total
        FROM "TransactionItem" ti
        JOIN "Transaction" tr ON tr.id = ti."transactionId"
        WHERE tr."transactionType" = 'SALE'
          AND tr."transactionDate" >= ${sixMonthsAgo}
        GROUP BY month
        ORDER BY month
      `,
      'Dashboard Monthly Revenue',
      'TransactionItem',
      'aggregate'
    ),
    query(
      prisma.$queryRaw<Array<{ month: Date; total: Prisma.Decimal | null }>>`
        SELECT date_trunc('month', "transactionDate") AS month, SUM("totalAmount") AS total
        FROM "Transaction"
        WHERE "transactionType" = 'PURCHASE'
          AND "transactionDate" >= ${sixMonthsAgo}
        GROUP BY month
        ORDER BY month
      `,
      'Dashboard Monthly Purchase',
      'Transaction',
      'aggregate'
    )
  ]);

  const [
    transactionItemTotalsRow = {
      daily_feed_sale: 0,
      daily_medicine_sale: 0,
      daily_feed_purchase: 0,
      daily_medicine_purchase: 0,
      daily_chicken_purchase: 0,
      daily_egg_purchase: 0,
      total_feed_sale: 0,
      total_medicine_sale: 0,
      total_feed_purchase: 0,
      total_medicine_purchase: 0,
      total_chicken_purchase: 0,
      total_egg_purchase: 0
    }
  ] = transactionItemTotals;

  const [transactionDueTotalsRow = { total_customer_due: 0, total_feed_medicine_due: 0, total_egg_chicken_due: 0 }] = transactionDueTotals;
  const [expenseTotalsRow = { daily_expense: 0, total_expense: 0 }] = expenseTotals;
  const [paymentTotalsRow = { daily_party_payment: 0, total_party_payment: 0 }] = paymentTotals;

  const monthlyRevenueResults = monthRanges.map((range) => {
    const row = monthlyRevenueRows.find((item) => item.month.toISOString().slice(0, 7) === range.start.toISOString().slice(0, 7));
    return { _sum: { lineTotal: row ? Number(row.total ?? 0) : 0 } };
  });

  const monthlyExpenseResults = monthRanges.map((range) => {
    const purchaseRow = monthlyPurchaseRows.find((item) => item.month.toISOString().slice(0, 7) === range.start.toISOString().slice(0, 7));
    const expenseRow = expenseMonthlyGroups.find((item) => item.month.toISOString().slice(0, 7) === range.start.toISOString().slice(0, 7));
    return { _sum: { totalAmount: Number(purchaseRow?.total ?? 0), amount: Number(expenseRow?.total ?? 0) } };
  });

  // Filter products with low stock
  const filteredLowStockAlerts = (lowStockAlerts || []).filter((product: any) => {
    const quantity = Number(product.stockBalance?.quantityOnHand ?? 0);
    const threshold = Number(product.lowStockThreshold ?? 0);
    return threshold > 0 && quantity <= threshold;
  });

  const dailyFeedSale = Number(transactionItemTotalsRow.daily_feed_sale ?? 0);
  const dailyMedicineSale = Number(transactionItemTotalsRow.daily_medicine_sale ?? 0);
  const dailyFeedPurchase = Number(transactionItemTotalsRow.daily_feed_purchase ?? 0);
  const dailyMedicinePurchase = Number(transactionItemTotalsRow.daily_medicine_purchase ?? 0);
  const dailyChickenPurchase = Number(transactionItemTotalsRow.daily_chicken_purchase ?? 0);
  const dailyEggPurchase = Number(transactionItemTotalsRow.daily_egg_purchase ?? 0);
  const dailyExpenses = Number(expenseTotalsRow.daily_expense ?? 0);
  const dailyPartyPayment = Number(paymentTotalsRow.daily_party_payment ?? 0);
  const dailyTotalExpense = dailyFeedPurchase + dailyMedicinePurchase + dailyExpenses + dailyPartyPayment;
  const totalFeedSale = Number(transactionItemTotalsRow.total_feed_sale ?? 0);
  const totalMedicineSale = Number(transactionItemTotalsRow.total_medicine_sale ?? 0);
  const totalFeedPurchase = Number(transactionItemTotalsRow.total_feed_purchase ?? 0);
  const totalMedicinePurchase = Number(transactionItemTotalsRow.total_medicine_purchase ?? 0);
  const totalChickenPurchase = Number(transactionItemTotalsRow.total_chicken_purchase ?? 0);
  const totalEggPurchase = Number(transactionItemTotalsRow.total_egg_purchase ?? 0);
  const totalExpenses = Number(expenseTotalsRow.total_expense ?? 0);
  const totalPartyPayment = Number(paymentTotalsRow.total_party_payment ?? 0);
  const totalTotalExpense = totalFeedPurchase + totalMedicinePurchase + totalExpenses + totalPartyPayment;
  const totalCustomerDue = Number(transactionDueTotalsRow.total_customer_due ?? 0);
  const totalFeedMedicineDue = Number(transactionDueTotalsRow.total_feed_medicine_due ?? 0);
  const totalEggChickenSupplierDue = Number(transactionDueTotalsRow.total_egg_chicken_due ?? 0);
  const totalStock = stockBalances.reduce((sum: number, sb: any) => sum + Number(sb.quantityOnHand ?? 0), 0);
  const totalStockValue = stockBalances.reduce((sum: number, sb: any) => {
    const qty = Number(sb.quantityOnHand ?? 0);
    const cost = Number(sb.averageCost ?? 0);
    return sum + qty * cost;
  }, 0);

  const totalSales = totalFeedSale + totalMedicineSale;
  const netProfit = totalSales - totalTotalExpense;

  type DashboardCardItem = {
    title: string;
    value: string;
    metric: string;
    metricColor: string;
    icon: LucideIcon;
    accent: string;
    valueColor?: string;
    className?: string;
  };

  const dailySummaryCards: DashboardCardItem[] = [
    {
      title: 'Daily Sale',
      value: formatCurrency(dailyFeedSale + dailyMedicineSale),
      metric: dailyFeedSale + dailyMedicineSale > 0 ? '+ ' + formatCurrency(dailyFeedSale + dailyMedicineSale) : 'No sales',
      metricColor: 'text-emerald-600',
      icon: ShoppingCart,
      accent: 'bg-amber-50 text-amber-600'
    },
    {
      title: 'Daily Purchase',
      value: formatCurrency(dailyFeedPurchase + dailyMedicinePurchase),
      metric: dailyFeedPurchase + dailyMedicinePurchase > 0 ? '+ ' + formatCurrency(dailyFeedPurchase + dailyMedicinePurchase) : 'No purchase',
      metricColor: 'text-sky-600',
      icon: Box,
      accent: 'bg-violet-50 text-violet-600'
    },
    {
      title: "Today's Expense",
      value: formatCurrency(dailyExpenses),
      metric: dailyExpenses > 0 ? '- ' + formatCurrency(dailyExpenses) : 'No expense',
      metricColor: 'text-rose-600',
      icon: Wallet,
      accent: 'bg-rose-50 text-rose-600'
    },
    {
      title: "Today's Party Supplier Payment",
      value: formatCurrency(dailyPartyPayment),
      metric: dailyPartyPayment > 0 ? '- ' + formatCurrency(dailyPartyPayment) : 'No party supplier payment',
      metricColor: 'text-amber-600',
      icon: DollarSign,
      accent: 'bg-amber-50 text-amber-600'
    }
  ];

  const totalSummaryCards: DashboardCardItem[] = [
    {
      title: 'Total Sales',
      value: formatCurrency(totalFeedSale + totalMedicineSale),
      metric: totalFeedSale + totalMedicineSale > 0 ? '+ ' + ((totalMedicineSale / (totalFeedSale + totalMedicineSale)) * 100).toFixed(1) + '%' : '0%',
      metricColor: 'text-emerald-600',
      icon: ShoppingCart,
      accent: 'bg-indigo-50 text-indigo-600'
    },
    {
      title: 'Total Purchase',
      value: formatCurrency(totalFeedPurchase + totalMedicinePurchase),
      metric: totalFeedPurchase + totalMedicinePurchase > 0 ? '+ ' + ((totalMedicinePurchase / (totalFeedPurchase + totalMedicinePurchase)) * 100).toFixed(1) + '%' : '0%',
      metricColor: 'text-emerald-600',
      icon: Box,
      accent: 'bg-violet-50 text-violet-600'
    },
    {
      title: 'Total Expense',
      value: formatCurrency(totalExpenses),
      metric: totalExpenses > 0 ? formatCurrency(totalExpenses) : 'No expense',
      metricColor: 'text-rose-600',
      icon: Wallet,
      accent: 'bg-orange-50 text-orange-600'
    },
    {
      title: 'Total Party Supplier Payment',
      value: formatCurrency(totalPartyPayment),
      metric: totalPartyPayment > 0 ? 'Party supplier payments outstanding' : 'All party supplier payments cleared',
      metricColor: totalPartyPayment > 0 ? 'text-rose-600' : 'text-emerald-600',
      icon: ClipboardList,
      accent: 'bg-amber-50 text-amber-600'
    },
    {
      title: 'Total Due',
      value: formatCurrency(totalCustomerDue + totalFeedMedicineDue + totalEggChickenSupplierDue),
      metric: totalCustomerDue + totalFeedMedicineDue + totalEggChickenSupplierDue > 0 ? 'Outstanding dues' : 'All dues cleared',
      metricColor: 'text-amber-600',
      valueColor: 'text-amber-600',
      icon: Layers,
      accent: 'bg-amber-50 text-amber-600',
      className: 'border-amber-200'
    },
    {
      title: 'Total Stock Value',
      value: formatCurrency(totalStockValue),
      metric: totalStockValue > 0 ? `${formatNumber(totalStock)} units` : 'No stock',
      metricColor: 'text-emerald-600',
      icon: BarChart3,
      accent: 'bg-teal-50 text-teal-600'
    }
  ];

  const revenueData = monthlyRevenueResults.map((result, idx) => ({
    label: monthLabels[idx],
    value: Number(result._sum.lineTotal ?? 0)
  }));

  const expenseData = monthlyExpenseResults.map((result, idx) => ({
    label: monthLabels[idx],
    value: Number(result._sum.totalAmount ?? 0) + Number(result._sum.amount ?? 0)
  }));

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);
  const totalExpense = expenseData.reduce((sum, item) => sum + item.value, 0);
  const maxRevenue = Math.max(...revenueData.map((item) => item.value), 1);
  const maxExpense = Math.max(...expenseData.map((item) => item.value), 1);

  profiler.printReport();

  const profit = Math.max(netProfit, 0);
  const loss = Math.abs(Math.min(netProfit, 0));
  const total = profit + loss;

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="">
        {dbUnavailable ? (
          <div className="mb-6">
            <ServiceUnavailableCard
              title="Dashboard data is temporarily unavailable"
              description="The database connection is currently unavailable, so live farm totals are not available right now. You can still browse the workspace while the service recovers."
            />
          </div>
        ) : null}
        <section className="space-y-6">
          <div className="">
            <div className="grid gap-4">
              <div>
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-section-title text-slate-950">Daily Summary</h2>
                    <p className="mt-1 text-sm text-slate-500">Today's farm activity at a glance.</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Updated</div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  {dailySummaryCards.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SummaryCard
                        key={item.title}
                        title={item.title}
                        value={item.value}
                        metric={item.metric}
                        metricColor={item.metricColor}
                        valueColor={item.valueColor}
                        icon={Icon}
                        accent={item.accent}
                        className={item.className}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-section-title text-slate-950">Total Summary</h2>
                    <p className="mt-1 text-sm text-slate-500">Overall totals across the farm.</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Summary</div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                   {totalSummaryCards.map((item) => {
                     const Icon = item.icon;
                     return (
                       <SummaryCard
                         key={item.title}
                         title={item.title}
                         value={item.value}
                         metric={item.metric}
                         metricColor={item.metricColor}
                         valueColor={item.valueColor}
                         icon={Icon}
                         accent={item.accent}
                         className={item.className}
                       />
                     );
                   })}
                 </div>
              </div>
            </div>
          </div>

          <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-section-title">Net Profit / Loss Breakdown</h2>
                  <p className="mt-1 text-card-subtitle">Financial performance overview</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-sm font-medium text-slate-600">
                    {netProfit >= 0 ? 'Profitable' : 'Loss Period'}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="flex flex-col items-center">
                  <div className="relative h-[280px] w-[280px]">
                    <svg viewBox="0 0 240 240" className="h-full w-full">
                      {(() => {if (total === 0) {
                          return (
                            <>
                              <circle cx="120" cy="120" r="90" fill="#F1F5F9" />
                              <circle cx="120" cy="120" r="60" fill="white" />
                              <text x="120" y="115" textAnchor="middle" className="text-sm fill-slate-400" fontSize="14">No data</text>
                            </>
                          );
                        }
                        const gap = 2;
                        const gapAngle = (gap / total) * 360;
                        return (
                          <>
                            {profit > 0 && (
                              <path
                                d={describeArc(120, 120, 90, gapAngle / 2, (profit / total) * 360 + gapAngle / 2)}
                                fill="#16A34A"
                                stroke="white"
                                strokeWidth="3"
                              />
                            )}
                            {loss > 0 && (
                              <path
                                d={describeArc(120, 120, 90, (profit / total) * 360 + gapAngle / 2, 360 + gapAngle / 2)}
                                fill="#DC2626"
                                stroke="white"
                                strokeWidth="3"
                              />
                            )}
                            <circle cx="120" cy="120" r="60" fill="white" />
                            <text x="120" y="112" textAnchor="middle" className="text-xs fill-slate-400" fontSize="12">Net</text>
                            <text x="120" y="132" textAnchor="middle" className={`text-lg font-bold ${netProfit >= 0 ? 'fill-emerald-600' : 'fill-rose-600'}`}>
                              {netProfit >= 0 ? 'Profit' : 'Loss'}
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <div className="mt-5 flex items-center gap-6">
                    {profit > 0 ? (
                      <div className="flex items-center gap-2" title={`Profit: ${formatCurrency(profit)} (${total > 0 ? (profit / total * 100).toFixed(1) : 0}%)`}>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-medium text-slate-600">Profit</span>
                        <span className="text-sm font-semibold text-slate-800">{formatCurrency(profit)}</span>
                      </div>
                    ) : null}
                    {loss > 0 ? (
                      <div className="flex items-center gap-2" title={`Loss: ${formatCurrency(loss)} (${total > 0 ? (loss / total * 100).toFixed(1) : 0}%)`}>
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span className="text-sm font-medium text-slate-600">Loss</span>
                        <span className="text-sm font-semibold text-slate-800">{formatCurrency(loss)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Key Metrics</h3>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-sm text-slate-500">Total Income</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{formatCurrency(totalRevenue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          <span className="text-sm text-slate-500">Total Expense</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{formatCurrency(totalExpense)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="text-sm text-slate-500">Net Result</span>
                        </div>
                        <span className={`text-sm font-semibold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(netProfit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Ratios</h3>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Profit Margin</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {totalRevenue > 0 ? `${(netProfit / totalRevenue * 100).toFixed(1)}%` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Expense Ratio</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {totalRevenue > 0 ? `${(totalExpense / totalRevenue * 100).toFixed(1)}%` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 ${netProfit >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                        {netProfit >= 0 ? (
                          <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        ) : (
                          <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {netProfit >= 0 ? 'Profitable' : 'Operating at a Loss'}
                        </p>
                        <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(netProfit)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

        </section>

      </div>
    </main>
  );
}
