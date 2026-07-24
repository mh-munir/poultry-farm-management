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
import { requireUser } from '@/lib/auth';
import { dbQuery, prisma } from '@/server/db';
import { Card } from '@/components/ui/card';
import { QuickActionItem } from '@/components/dashboard/quick-action-item';
import { SummaryCard } from '@/components/dashboard/summary-card';

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
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

export default async function DashboardPage() {
  const session = await requireUser();
  const userName = session?.user?.name ?? session?.user?.email ?? 'there';

  const { start, end } = getTodayRange();
  const sixMonthsAgo = new Date(start);
  sixMonthsAgo.setMonth(start.getMonth() - 5);

  function query<T>(q: Promise<T>): Promise<T> {
    return dbQuery(q, 30000);
  }

  const [
    dailyFeedSaleAgg,
    dailyMedicineSaleAgg,
    dailyPurchaseCostAgg,
    totalFeedSaleAgg,
    totalMedicineSaleAgg,
    totalPurchaseCostAgg,
    totalCustomerDueAgg,
    totalFeedMedicineDueAgg,
    totalEggChickenSupplierDueAgg,
    totalStockAgg,
    recentTransactions,
    activePartiesCount,
    openInvoicesCount,
    lowStockAlerts
  ] = await Promise.all([
    query(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'SALE',
            transactionDate: { gte: start, lt: end }
          },
          product: { productType: 'FEED' }
        }
      })
    ),
    query(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'SALE',
            transactionDate: { gte: start, lt: end }
          },
          product: { productType: 'MEDICINE' }
        }
      })
    ),
    query(
      prisma.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          transactionType: 'PURCHASE',
          transactionDate: { gte: start, lt: end }
        }
      })
    ),
    query(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'SALE'
          },
          product: { productType: 'FEED' }
        }
      })
    ),
    query(
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'SALE'
          },
          product: { productType: 'MEDICINE' }
        }
      })
    ),
    query(
      prisma.transaction.aggregate({
        _sum: { totalAmount: true },
        where: { transactionType: 'PURCHASE' }
      })
    ),
    query(
      prisma.transaction.aggregate({
        _sum: { dueAmount: true },
        where: {
          transactionType: 'SALE',
          dueAmount: { gt: 0 }
        }
      })
    ),
    query(
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
      })
    ),
    query(
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
      })
    ),
    query(prisma.stockBalance.aggregate({ _sum: { quantityOnHand: true } })),
    query(
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
      })
    ),
    query(prisma.party.count({ where: { isActive: true } })),
    query(
      prisma.transaction.count({
        where: { transactionType: 'SALE', status: { not: 'COMPLETED' } }
      })
    ),
    query(
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
      })
    ),
    query(
      prisma.transactionItem.aggregate({
        where: {
          transaction: {
            transactionType: 'SALE',
            transactionDate: { gte: sixMonthsAgo }
          }
        },
        _sum: { lineTotal: true }
      })
    ),
    query(
      prisma.transaction.aggregate({
        where: {
          transactionType: 'PURCHASE',
          transactionDate: { gte: sixMonthsAgo }
        },
        _sum: { totalAmount: true }
      })
    )
  ]);

  // Filter products with low stock
  const filteredLowStockAlerts = (lowStockAlerts || []).filter((product: any) => {
    const quantity = Number(product.stockBalance?.quantityOnHand ?? 0);
    const threshold = Number(product.lowStockThreshold ?? 0);
    return threshold > 0 && quantity <= threshold;
  });

  const dailyFeedSale = Number(dailyFeedSaleAgg._sum.lineTotal ?? 0);
  const dailyMedicineSale = Number(dailyMedicineSaleAgg._sum.lineTotal ?? 0);
  const dailyPurchaseCost = Number(dailyPurchaseCostAgg._sum.totalAmount ?? 0);
  const totalFeedSale = Number(totalFeedSaleAgg._sum.lineTotal ?? 0);
  const totalMedicineSale = Number(totalMedicineSaleAgg._sum.lineTotal ?? 0);
  const totalPurchaseCost = Number(totalPurchaseCostAgg._sum.totalAmount ?? 0);
  const totalCustomerDue = Number(totalCustomerDueAgg._sum.dueAmount ?? 0);
  const totalFeedMedicineDue = Number(totalFeedMedicineDueAgg._sum.dueAmount ?? 0);
  const totalEggChickenSupplierDue = Number(totalEggChickenSupplierDueAgg._sum.dueAmount ?? 0);
  const totalStock = Number(totalStockAgg._sum.quantityOnHand ?? 0);

  const dailySummaryCards = [
    {
      title: 'Daily Feed Sale',
      value: formatCurrency(dailyFeedSale),
      metric: dailyFeedSale > 0 ? '+ ' + formatCurrency(dailyFeedSale) : 'No sales',
      metricColor: 'text-emerald-600',
      icon: ShoppingCart,
      accent: 'bg-amber-50 text-amber-600'
    },
    {
      title: 'Daily Medicine Sales',
      value: formatCurrency(dailyMedicineSale),
      metric: dailyMedicineSale > 0 ? '+ ' + formatCurrency(dailyMedicineSale) : 'No sales',
      metricColor: 'text-sky-600',
      icon: Box,
      accent: 'bg-violet-50 text-violet-600'
    },
    {
      title: 'Today Cost',
      value: formatCurrency(dailyPurchaseCost),
      metric: dailyPurchaseCost > 0 ? '- ' + formatCurrency(dailyPurchaseCost) : 'No cost',
      metricColor: 'text-rose-600',
      icon: Wallet,
      accent: 'bg-rose-50 text-rose-600'
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

  const totalSummaryCards = [
    {
      title: 'Total Feed Sales',
      value: formatCurrency(totalFeedSale),
      metric: totalFeedSale > 0 ? 'Active' : 'No sales',
      metricColor: 'text-slate-600',
      icon: ShoppingCart,
      accent: 'bg-indigo-50 text-indigo-600'
    },
    {
      title: 'Total Medicine Sales',
      value: formatCurrency(totalMedicineSale),
      metric: totalMedicineSale > 0 ? '+ ' + ((totalMedicineSale / (totalFeedSale + totalMedicineSale)) * 100).toFixed(1) + '%' : '0%',
      metricColor: 'text-emerald-600',
      icon: Box,
      accent: 'bg-violet-50 text-violet-600'
    },
    {
      title: 'Total Cost',
      value: formatCurrency(totalPurchaseCost),
      metric: totalPurchaseCost > 0 ? formatCurrency(totalPurchaseCost) : 'No cost',
      metricColor: 'text-rose-600',
      icon: Wallet,
      accent: 'bg-orange-50 text-orange-600'
    },
    {
      title: 'Customer Due',
      value: formatCurrency(totalCustomerDue),
      metric: totalCustomerDue > 0 ? 'Customer due outstanding' : 'Customer cleared',
      metricColor: totalCustomerDue > 0 ? 'text-rose-600' : 'text-emerald-600',
      icon: DollarSign,
      accent: 'bg-rose-50 text-rose-600'
    },
    {
      title: 'Feed & Medicine Due',
      value: formatCurrency(totalFeedMedicineDue),
      metric: totalFeedMedicineDue > 0 ? 'Feed/Medicine supplier due' : 'Cleared',
      metricColor: totalFeedMedicineDue > 0 ? 'text-slate-600' : 'text-emerald-600',
      icon: Layers,
      accent: 'bg-sky-50 text-sky-600'
    },
    {
      title: 'Eggs & Chicken Supplier Due',
      value: formatCurrency(totalEggChickenSupplierDue),
      metric: totalEggChickenSupplierDue > 0 ? 'Supplier due outstanding' : 'Cleared',
      metricColor: totalEggChickenSupplierDue > 0 ? 'text-slate-600' : 'text-emerald-600',
      icon: ClipboardList,
      accent: 'bg-amber-50 text-amber-600'
    },
    {
      title: 'Total Stock',
      value: `${formatNumber(totalStock)} units`,
      metric: totalStock > 0 ? '+ ' + formatNumber(totalStock) : '0',
      metricColor: 'text-emerald-600',
      icon: BarChart3,
      accent: 'bg-teal-50 text-teal-600'
    }
  ];

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

  const monthlyRevenueResults = await Promise.all(
    monthRanges.map((range) =>
      query(
        prisma.transactionItem.aggregate({
          _sum: { lineTotal: true },
          where: {
            transaction: {
              transactionType: 'SALE',
              transactionDate: { gte: range.start, lt: range.end }
            }
          }
        })
      )
    )
  );

  const monthlyExpenseResults = await Promise.all(
    monthRanges.map((range) =>
      query(
        prisma.transaction.aggregate({
          _sum: { totalAmount: true },
          where: {
            transactionType: 'PURCHASE',
            transactionDate: { gte: range.start, lt: range.end }
          }
        })
      )
    )
  );

  const revenueData = monthlyRevenueResults.map((result, idx) => ({
    label: monthLabels[idx],
    value: Number(result._sum.lineTotal ?? 0)
  }));

  const expenseData = monthlyExpenseResults.map((result, idx) => ({
    label: monthLabels[idx],
    value: Number(result._sum.totalAmount ?? 0)
  }));

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);
  const totalExpense = expenseData.reduce((sum, item) => sum + item.value, 0);
  const maxRevenue = Math.max(...revenueData.map((item) => item.value), 1);
  const maxExpense = Math.max(...expenseData.map((item) => item.value), 1);

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="">
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
                        icon={Icon}
                        accent={item.accent}
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
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">Supplier due breakdown</p>
                  <p className="mt-1">
                    Feed and Medicine dues are grouped together for your feed/medicine suppliers. Eggs and Chicken dues are kept separate for poultry suppliers.
                  </p>
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
                        icon={Icon}
                        accent={item.accent}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.8fr_1.2fr]">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Revenue</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Monthly sales and invoice performance.</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                  <Activity className="h-4 w-4" /> Live
                </div>
              </div>
              <div className="mt-6 space-y-3 rounded-lg bg-slate-950/5 p-4 text-sm text-muted-foreground">
                <div className="flex items-end gap-3 h-56">
                  {revenueData.map((item) => (
                    <div key={item.label} className="flex-1 text-center">
                      <div
                        className="mx-auto h-full rounded-lg bg-primary transition-all duration-300"
                        style={{ height: `${(item.value / maxRevenue) * 100}%`, width: '100%' }}
                      />
                      <p className="mt-3 text-xs font-medium text-slate-700">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  {revenueData.map((item) => (
                    <span key={item.label}>{item.label}</span>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Expenses</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Budget, purchase, and operational costs.</p>
                </div>
                <button className="text-sm font-medium text-primary hover:text-primary/80">View all</button>
              </div>
              <div className="mt-6 space-y-3 rounded-lg bg-slate-950/5 p-4 text-sm text-muted-foreground">
                <div className="flex items-end gap-3 h-56">
                  {expenseData.map((item) => (
                    <div key={item.label} className="flex-1 text-center">
                      <div
                        className="mx-auto h-full rounded-lg bg-destructive transition-all duration-300"
                        style={{ height: `${(item.value / maxExpense) * 100}%`, width: '100%' }}
                      />
                      <p className="mt-3 text-xs font-medium text-slate-700">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  {expenseData.map((item) => (
                    <span key={item.label}>{item.label}</span>
                  ))}
                </div>
              </div>
            </Card>
          </div>

        </section>

      </div>
    </main>
  );
}
