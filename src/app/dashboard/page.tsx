import {
  Users,
  ShoppingCart,
  Box,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CalendarDays,
  DollarSign,
  Layers,
  TrendingUp,
  ClipboardList
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { dbQuery, prisma } from '@/server/db';
import { Card } from '@/components/ui/card';
import { QuickActionItem } from '@/components/dashboard/quick-action-item';
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

  function query<T>(q: Promise<T>): Promise<T> {
    return dbQuery(q, 30000);
  }

  let dbUnavailable = false;

  async function safeQuery<T>(q: Promise<T>, fallback: T): Promise<T> {
    const result = await query(q);
    if (result === undefined) {
      dbUnavailable = true;
      return fallback;
    }
    return result as T;
  }

  const [
    dailyFeedSaleAgg,
    dailyMedicineSaleAgg,
    dailyFeedPurchaseCostAgg,
    dailyMedicinePurchaseCostAgg,
    dailyChickenPurchaseCostAgg,
    dailyEggPurchaseCostAgg,
    dailyExpenseAgg,
    totalFeedSaleAgg,
    totalMedicineSaleAgg,
    totalFeedPurchaseCostAgg,
    totalMedicinePurchaseCostAgg,
    totalChickenPurchaseCostAgg,
    totalEggPurchaseCostAgg,
    totalExpenseAgg,
    totalCustomerDueAgg,
    totalFeedMedicineDueAgg,
    totalEggChickenSupplierDueAgg,
    totalStockAgg,
    totalStockValueAgg,
    recentTransactions,
    activePartiesCount,
    openInvoicesCount,
    lowStockAlerts,
    sixMonthSalesAgg,
    sixMonthPurchaseAgg,
    expensesForDashboard,
    dailyPartyPaymentAgg,
    totalPartyPaymentAgg
  ] = await Promise.all([
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'SALE',
            transactionDate: { gte: start, lt: end }
          },
          product: { productType: 'FEED' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'SALE',
            transactionDate: { gte: start, lt: end }
          },
          product: { productType: 'MEDICINE' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'PURCHASE',
            transactionDate: { gte: start, lt: end }
          },
          product: { productType: 'FEED' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'PURCHASE',
            transactionDate: { gte: start, lt: end }
          },
          product: { productType: 'MEDICINE' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'PURCHASE',
            transactionDate: { gte: start, lt: end }
          },
          product: { productType: 'CHICKEN' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'PURCHASE',
            transactionDate: { gte: start, lt: end }
          },
          product: { productType: 'EGG' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          expenseDate: { gte: start, lt: end }
        }
      }),
      { _sum: { amount: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'SALE'
          },
          product: { productType: 'FEED' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'SALE'
          },
          product: { productType: 'MEDICINE' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'PURCHASE'
          },
          product: { productType: 'FEED' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'PURCHASE'
          },
          product: { productType: 'MEDICINE' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'PURCHASE'
          },
          product: { productType: 'CHICKEN' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'PURCHASE'
          },
          product: { productType: 'EGG' }
        }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.expense.aggregate({
        _sum: { amount: true }
      }),
      { _sum: { amount: null } }
    ),
    safeQuery(
      prisma.transaction.aggregate({
        _sum: { dueAmount: true },
        where: {
          transactionType: 'SALE',
          dueAmount: { gt: 0 }
        }
      }),
      { _sum: { dueAmount: null } }
    ),
    safeQuery(
      prisma.transaction.aggregate({
        _sum: { dueAmount: true },
        where: {
          transactionType: 'PURCHASE',
          dueAmount: { gt: 0 },
          transactionItems: {
            some: {
              product: { productType: { in: ['FEED', 'MEDICINE'] } }
            }
          }
        }
      }),
      { _sum: { dueAmount: null } }
    ),
    safeQuery(
      prisma.transaction.aggregate({
        _sum: { dueAmount: true },
        where: {
          transactionType: 'PURCHASE',
          dueAmount: { gt: 0 },
          transactionItems: {
            some: {
              product: { productType: { in: ['EGG', 'CHICKEN'] } }
            }
          }
        }
      }),
      { _sum: { dueAmount: null } }
    ),
    safeQuery(prisma.stockBalance.aggregate({ _sum: { quantityOnHand: true } }), { _sum: { quantityOnHand: null } }),
    safeQuery(
      prisma.stockBalance.findMany({
        select: { quantityOnHand: true, averageCost: true }
      }),
      [] as any[]
    ),
    safeQuery(
      prisma.transaction.findMany({
        take: 5,
        orderBy: { transactionDate: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          party: { select: { name: true } },
          totalAmount: true,
          status: true,
          transactionType: true
        }
      }),
      [] as any[]
    ),
    safeQuery(prisma.party.count({ where: { isActive: true } }), 0),
    safeQuery(
      prisma.transaction.count({
        where: { transactionType: 'SALE', status: { not: 'COMPLETED' } }
      }),
      0
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
      [] as any[]
    ),
    safeQuery(
      prisma.transactionItem.aggregate({
        where: {
          transaction: {
            transactionType: 'SALE',
            transactionDate: { gte: sixMonthsAgo }
          }
        },
        _sum: { lineTotal: true }
      }),
      { _sum: { lineTotal: null } }
    ),
    safeQuery(
      prisma.transaction.aggregate({
        where: {
          transactionType: 'PURCHASE',
          transactionDate: { gte: sixMonthsAgo }
        },
        _sum: { totalAmount: true }
      }),
      { _sum: { totalAmount: null } }
    ),
    safeQuery(
      prisma.expense.findMany({
        select: {
          id: true,
          amount: true,
          expenseDate: true,
          description: true
        },
        orderBy: { expenseDate: 'desc' }
      }),
      [] as any[]
    ),
    safeQuery(
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: { gte: start, lt: end }
        }
      }),
      { _sum: { amount: null } }
    ),
    safeQuery(
      prisma.payment.aggregate({
        _sum: { amount: true }
      }),
      { _sum: { amount: null } }
    )
  ]);

  const monthlyRevenueResults = await Promise.all(
    monthRanges.map((range) =>
      safeQuery(
        prisma.transactionItem.aggregate({
          _sum: { lineTotal: true },
          where: {
            transaction: {
              transactionType: 'SALE',
              transactionDate: { gte: range.start, lt: range.end }
            }
          }
        }),
        { _sum: { lineTotal: null } }
      )
    )
  );

  const monthlyExpenseResults = await Promise.all(
    monthRanges.map((range) =>
      safeQuery(
        prisma.transaction.aggregate({
          _sum: { totalAmount: true },
          where: {
            transactionType: 'PURCHASE',
            transactionDate: { gte: range.start, lt: range.end }
          }
        }),
        { _sum: { totalAmount: null } }
      )
    )
  );

  const monthlyExpenseResults2 = monthRanges.map((range) => {
    const total = (expensesForDashboard || []).reduce((sum, expense) => {
      const expenseDate = normalizeDashboardDate(expense.expenseDate);
      if (!expenseDate || expenseDate < range.start || expenseDate >= range.end) {
        return sum;
      }
      return sum + Number(expense.amount ?? 0);
    }, 0);

    return { _sum: { amount: total } };
  });

  // Filter products with low stock
  const filteredLowStockAlerts = (lowStockAlerts || []).filter((product: any) => {
    const quantity = Number(product.stockBalance?.quantityOnHand ?? 0);
    const threshold = Number(product.lowStockThreshold ?? 0);
    return threshold > 0 && quantity <= threshold;
  });

  const dailyFeedSale = Number(dailyFeedSaleAgg._sum.lineTotal ?? 0);
  const dailyMedicineSale = Number(dailyMedicineSaleAgg._sum.lineTotal ?? 0);
  const dailyFeedPurchase = Number(dailyFeedPurchaseCostAgg._sum.lineTotal ?? 0);
  const dailyMedicinePurchase = Number(dailyMedicinePurchaseCostAgg._sum.lineTotal ?? 0);
  const dailyChickenPurchase = Number(dailyChickenPurchaseCostAgg._sum.lineTotal ?? 0);
  const dailyEggPurchase = Number(dailyEggPurchaseCostAgg._sum.lineTotal ?? 0);
  const dailyExpenses = (expensesForDashboard || []).reduce((sum, expense) => {
    const expenseDate = normalizeDashboardDate(expense.expenseDate);
    if (!expenseDate || expenseDate < start || expenseDate >= end) {
      return sum;
    }
    return sum + Number(expense.amount ?? 0);
  }, 0);
  const dailyPartyPayment = Number(dailyPartyPaymentAgg._sum.amount ?? 0);
  const dailyTotalExpense = dailyFeedPurchase + dailyMedicinePurchase + dailyExpenses + dailyPartyPayment;
  const totalFeedSale = Number(totalFeedSaleAgg._sum.lineTotal ?? 0);
  const totalMedicineSale = Number(totalMedicineSaleAgg._sum.lineTotal ?? 0);
  const totalFeedPurchase = Number(totalFeedPurchaseCostAgg._sum.lineTotal ?? 0);
  const totalMedicinePurchase = Number(totalMedicinePurchaseCostAgg._sum.lineTotal ?? 0);
  const totalChickenPurchase = Number(totalChickenPurchaseCostAgg._sum.lineTotal ?? 0);
  const totalEggPurchase = Number(totalEggPurchaseCostAgg._sum.lineTotal ?? 0);
  const totalExpenses = (expensesForDashboard || []).reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
  const totalPartyPayment = Number(totalPartyPaymentAgg._sum.amount ?? 0);
  const totalTotalExpense = totalFeedPurchase + totalMedicinePurchase + totalExpenses + totalPartyPayment;
  const totalCustomerDue = Number(totalCustomerDueAgg._sum.dueAmount ?? 0);
  const totalFeedMedicineDue = Number(totalFeedMedicineDueAgg._sum.dueAmount ?? 0);
  const totalEggChickenSupplierDue = Number(totalEggChickenSupplierDueAgg._sum.dueAmount ?? 0);
  const totalStock = Number(totalStockAgg._sum.quantityOnHand ?? 0);
  const totalStockValue = totalStockValueAgg.reduce((sum: number, sb: any) => {
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
    },
    {
      title: 'Daily Stock',
      value: `${formatNumber(totalStock)} units`,
      metric: totalStock > 0 ? '+ ' + formatNumber(totalStock) : '0',
      metricColor: 'text-emerald-600',
      icon: BarChart3,
      accent: 'bg-sky-50 text-sky-600'
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
    },
    {
      title: 'Net Profit/Loss',
      value: formatCurrency(netProfit),
      metric: netProfit >= 0 ? 'Profitable' : 'Loss incurred',
      metricColor: netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600',
      icon: TrendingUp,
      accent: 'bg-emerald-50 text-emerald-600'
    }
  ];

  const revenueData = monthlyRevenueResults.map((result, idx) => ({
    label: monthLabels[idx],
    value: Number(result._sum.lineTotal ?? 0)
  }));

  const expenseData = monthlyExpenseResults.map((result, idx) => ({
    label: monthLabels[idx],
    value: Number(result._sum.totalAmount ?? 0) + Number(monthlyExpenseResults2[idx]?._sum.amount ?? 0)
  }));

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);
  const totalExpense = expenseData.reduce((sum, item) => sum + item.value, 0);
  const maxRevenue = Math.max(...revenueData.map((item) => item.value), 1);
  const maxExpense = Math.max(...expenseData.map((item) => item.value), 1);

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
                    <h2 className="text-lg font-semibold text-slate-950">Daily Summary</h2>
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
                    <h2 className="text-lg font-semibold text-slate-950">Total Summary</h2>
                    <p className="mt-1 text-sm text-slate-500">Overall totals across the farm.</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Summary</div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
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
                <h2 className="text-lg font-semibold">Net Profit / Loss Breakdown</h2>
                <p className="mt-1 text-sm text-muted-foreground">Profit vs loss distribution.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center">
              <svg viewBox="0 0 200 200" className="h-64 w-64">
                {(() => {
                  const profit = Math.max(netProfit, 0);
                  const loss = Math.abs(Math.min(netProfit, 0));
                  const total = profit + loss;
                  if (total === 0) {
                    return <circle cx="100" cy="100" r="80" fill="#E5E7EB" />;
                  }
                  return (
                    <>
                      {profit > 0 && (
                        <path
                          d={describeArc(100, 100, 80, 0, (profit / total) * 360)}
                          fill="#16A34A"
                        />
                      )}
                      {loss > 0 && (
                        <path
                          d={describeArc(100, 100, 80, (profit / total) * 360, 360)}
                          fill="#DC2626"
                        />
                      )}
                    </>
                  );
                })()}
              </svg>
              <div className="mt-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#16A34A]"></span>
                  <span className="text-sm font-medium text-slate-700">Profit</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#DC2626]"></span>
                  <span className="text-sm font-medium text-slate-700">Loss</span>
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className="text-sm text-slate-500">Net Result</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {formatCurrency(netProfit)}
                </p>
              </div>
            </div>
          </Card>

        </section>

      </div>
    </main>
  );
}
