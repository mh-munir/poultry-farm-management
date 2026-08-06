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
import getDashboardDataCached, { getProfitAnalytics } from '@/features/dashboard/actions';
import { Card } from '@/components/ui/card';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { ServiceUnavailableCard } from '@/components/ui/service-unavailable-card';
import ProfitAnalyticsClient from '@/components/dashboard/profit-analytics-client';

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

function buildDailyProductProfitPieStyle(profitValue: number, purchaseValue: number) {
  const profitAmount = Math.max(profitValue, 0);
  const lossAmount = Math.max(-profitValue, 0);
  const total = profitAmount + lossAmount + purchaseValue;
  const profitPct = total > 0 ? (profitAmount / total) * 100 : 0;
  const lossPct = total > 0 ? (lossAmount / total) * 100 : 0;
  const stop1 = profitPct.toFixed(2);
  const stop2 = (profitPct + lossPct).toFixed(2);

  if (total === 0) {
    return { background: '#f8fafc' };
  }

  return {
    background: `conic-gradient(${profitAmount > 0 ? '#0ea5e9' : 'transparent'} 0% ${stop1}%, ${lossAmount > 0 ? '#dc2626' : 'transparent'} ${stop1}% ${stop2}%, #f97316 ${stop2}% 100%)`
  };
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

  let dbUnavailable = false;

  const {
    summaryRow,
    expenseMonthlyGroups,
    stockBalances,
    recentTransactions,
    monthlyRevenueRows,
    monthlyPurchaseRows
  } = await (async () => {
    try {
      return await getDashboardDataCached({ start, end, sixMonthsAgo });
    } catch (err) {
      // If the DB is unavailable keep the previous behaviour of showing ServiceUnavailableCard
      dbUnavailable = true;
      return { summaryRow: null, expenseMonthlyGroups: [], stockBalances: [], recentTransactions: [], monthlyRevenueRows: [], monthlyPurchaseRows: [] } as any;
    }
  })();

  // initial profit analytics for the server-rendered view (today by default)
  const profitInitial = await getProfitAnalytics({ start, end });

  // Defensive normalization: cached data may serialize Date -> string.
  const normalizeMonths = <T extends { month: any }>(arr: T[] | undefined): Array<Omit<T, 'month'> & { month: Date | null }> => {
    return (arr ?? []).map((r) => ({
      ...r,
      month: r.month == null ? null : (r.month instanceof Date ? r.month : new Date(String(r.month)))
    }));
  };

  const monthlyRevenueRowsNorm = normalizeMonths(monthlyRevenueRows as Array<{ month: any; total: any }>);
  const monthlyPurchaseRowsNorm = normalizeMonths(monthlyPurchaseRows as Array<{ month: any; total: any }>);
  const expenseMonthlyGroupsNorm = normalizeMonths(expenseMonthlyGroups as Array<{ month: any; total: any }>);

  const transactionItemTotals = [
    {
      daily_feed_sale: summaryRow?.daily_feed_sale ?? 0,
      daily_medicine_sale: summaryRow?.daily_medicine_sale ?? 0,
      daily_feed_purchase: summaryRow?.daily_feed_purchase ?? 0,
      daily_medicine_purchase: summaryRow?.daily_medicine_purchase ?? 0,
      daily_chicken_purchase: summaryRow?.daily_chicken_purchase ?? 0,
      daily_egg_purchase: summaryRow?.daily_egg_purchase ?? 0,
      total_feed_sale: summaryRow?.total_feed_sale ?? 0,
      total_medicine_sale: summaryRow?.total_medicine_sale ?? 0,
      total_feed_purchase: summaryRow?.total_feed_purchase ?? 0,
      total_medicine_purchase: summaryRow?.total_medicine_purchase ?? 0,
      total_chicken_purchase: summaryRow?.total_chicken_purchase ?? 0,
      total_egg_purchase: summaryRow?.total_egg_purchase ?? 0
    }
  ];

  const transactionDueTotals = [
    {
      total_customer_due: summaryRow?.total_customer_due ?? 0,
      total_feed_medicine_due: summaryRow?.total_feed_medicine_due ?? 0,
      total_egg_chicken_due: summaryRow?.total_egg_chicken_due ?? 0
    }
  ];

  const expenseTotals = [
    {
      daily_expense: summaryRow?.daily_expense ?? 0,
      total_expense: summaryRow?.total_expense ?? 0
    }
  ];

  const paymentTotals = [
    {
      daily_party_payment: summaryRow?.daily_party_payment ?? 0,
      total_party_payment: summaryRow?.total_party_payment ?? 0
    }
  ];

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
    const row = monthlyRevenueRowsNorm.find((item) =>
      item.month instanceof Date && item.month.toISOString().slice(0, 7) === range.start.toISOString().slice(0, 7)
    );
    return { _sum: { lineTotal: row ? Number(row.total ?? 0) : 0 } };
  });

  const monthlyExpenseResults = monthRanges.map((range) => {
    const purchaseRow = monthlyPurchaseRowsNorm.find((item) =>
      item.month instanceof Date && item.month.toISOString().slice(0, 7) === range.start.toISOString().slice(0, 7)
    );
    const expenseRow = expenseMonthlyGroupsNorm.find((item) =>
      item.month instanceof Date && item.month.toISOString().slice(0, 7) === range.start.toISOString().slice(0, 7)
    );
    return { _sum: { totalAmount: Number(purchaseRow?.total ?? 0), amount: Number(expenseRow?.total ?? 0) } };
  });

  const dailyFeedSale = Number(transactionItemTotalsRow.daily_feed_sale ?? 0);
  const dailyMedicineSale = Number(transactionItemTotalsRow.daily_medicine_sale ?? 0);
  const dailyFeedPurchase = Number(transactionItemTotalsRow.daily_feed_purchase ?? 0);
  const dailyMedicinePurchase = Number(transactionItemTotalsRow.daily_medicine_purchase ?? 0);
  const dailyExpenses = Number(expenseTotalsRow.daily_expense ?? 0);
  const dailyPartyPayment = Number(paymentTotalsRow.daily_party_payment ?? 0);
  const totalFeedSale = Number(transactionItemTotalsRow.total_feed_sale ?? 0);
  const totalMedicineSale = Number(transactionItemTotalsRow.total_medicine_sale ?? 0);
  const totalFeedPurchase = Number(transactionItemTotalsRow.total_feed_purchase ?? 0);
  const totalMedicinePurchase = Number(transactionItemTotalsRow.total_medicine_purchase ?? 0);
  const totalExpenses = Number(expenseTotalsRow.total_expense ?? 0);
  const totalPartyPayment = Number(paymentTotalsRow.total_party_payment ?? 0);
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
  const totalCostOfGoodsSold = totalFeedPurchase + totalMedicinePurchase;
  const totalOperatingExpenses = totalExpenses + totalPartyPayment;
  const netProfit = totalSales - (totalCostOfGoodsSold + totalOperatingExpenses);

  const dailySales = dailyFeedSale + dailyMedicineSale;
  const dailyPurchase = dailyFeedPurchase + dailyMedicinePurchase;
  const dailyProfit = dailySales - dailyPurchase;
  const dailyProductsSold = Number(summaryRow.daily_products_sold ?? 0);
  const dailyProfitColor = dailyProfit >= 0 ? 'text-emerald-600' : 'text-rose-600';
  const dailyProfitLabel = dailyProfit >= 0 ? 'Profit' : 'Loss';
  const dailyProductProfitSegments = [
    { name: dailyProfit >= 0 ? 'Profit' : 'Loss', value: Math.abs(dailyProfit), color: dailyProfit >= 0 ? '#0ea5e9' : '#dc2626' },
    { name: 'Purchase Cost', value: dailyPurchase, color: '#f97316' }
  ];
  const dailyProductProfitTotal = dailyProductProfitSegments.reduce((sum, segment) => sum + segment.value, 0);

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
      icon: ClipboardList,
      accent: 'bg-amber-50 text-amber-600'
    }
  ];

  const totalSummaryCards: DashboardCardItem[] = [
    {
      title: 'Total Sales',
      value: formatCurrency(totalSales),
      metric: totalSales > 0 ? '+ ' + ((totalMedicineSale / totalSales) * 100).toFixed(1) + '%' : '0%',
      metricColor: 'text-emerald-600',
      icon: ShoppingCart,
      accent: 'bg-indigo-50 text-indigo-600'
    },
    {
      title: 'Cost of Goods Sold',
      value: formatCurrency(totalCostOfGoodsSold),
      metric: totalCostOfGoodsSold > 0 ? '+ ' + ((totalMedicinePurchase / totalCostOfGoodsSold) * 100).toFixed(1) + '%' : '0%',
      metricColor: 'text-sky-600',
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

  const profit = Math.max(netProfit, 0);
  const loss = Math.abs(Math.min(netProfit, 0));
  const total = profit + loss;

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-4 sm:px-6 py-4">
      <div className="">
        {dbUnavailable ? (
          <div className="mb-6">
            <ServiceUnavailableCard
              title="Dashboard data is temporarily unavailable"
              description="The database connection is currently unavailable, so live farm totals are not available right now. You can still browse the workspace while the service recovers."
            />
          </div>
        ) : null}

        <div className="mb-6">
          <ProfitAnalyticsClient initialStart={start.toISOString()} initialEnd={end.toISOString()} initialData={profitInitial} />
        </div>
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
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
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
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
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

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              <Card className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-section-title">Daily Product Profit</h2>
                    <p className="mt-1 text-card-subtitle">Today's sales vs purchase profit breakdown.</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                    <span className="text-sm font-medium text-slate-600">1 month view</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
                  <div className="flex items-center justify-center">
                    <div className="relative h-40 w-40 rounded-full border bg-slate-100" style={buildDailyProductProfitPieStyle(dailyProfit, dailyPurchase)}>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-xs font-semibold text-slate-900">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Profit</span>
                        <span className="mt-1 text-sm">{dailyProfitLabel}</span>
                        <span className={`mt-1 text-lg font-bold ${dailyProfitColor}`}>{formatCurrency(dailyProfit)}</span>
                        <span className="mt-2 text-[10px] text-slate-500">Sales − Purchase</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Sales</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(dailySales)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-slate-500">Purchase cost</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(dailyPurchase)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-slate-500">{dailyProfit >= 0 ? 'Profit' : 'Loss'}</span>
                        <span className={`font-semibold ${dailyProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(dailyProfit)}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      <p className="font-medium text-slate-700">Breakdown</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Profit / loss</span>
                          <span>{formatCurrency(Math.abs(dailyProfit))}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Purchase cost</span>
                          <span>{formatCurrency(dailyPurchase)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Items sold</span>
                          <span>{formatNumber(dailyProductsSold)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    <div className="relative h-[240px] w-[240px] sm:h-[280px] sm:w-[280px]">
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
                  </div>
                </div>
              </Card>

            </div>

        </section>

      </div>
    </main>
  );
}
