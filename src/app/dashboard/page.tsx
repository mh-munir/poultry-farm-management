import Link from 'next/link';
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
import { prisma } from '@/server/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QuickActionItem } from '@/components/dashboard/quick-action-item';
import { RevenueSourceCard } from '@/components/dashboard/revenue-source-card';
import { SummaryCard } from '@/components/dashboard/summary-card';

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
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

  const [
    dailyFeedSaleAgg,
    dailyMedicineSaleAgg,
    dailyPurchaseCostAgg,
    totalFeedSaleAgg,
    totalMedicineSaleAgg,
    totalPurchaseCostAgg,
    totalStockAgg
  ] = await Promise.all([
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
    prisma.transaction.aggregate({
      _sum: { totalAmount: true },
      where: {
        transactionType: 'PURCHASE',
        transactionDate: { gte: start, lt: end }
      }
    }),
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      where: {
        transaction: {
          transactionType: 'SALE'
        },
        product: { productType: 'FEED' }
      }
    }),
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      where: {
        transaction: {
          transactionType: 'SALE'
        },
        product: { productType: 'MEDICINE' }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { totalAmount: true },
      where: { transactionType: 'PURCHASE' }
    }),
    prisma.stockBalance.aggregate({
      _sum: { quantityOnHand: true }
    })
  ]);

  const dailyFeedSale = Number(dailyFeedSaleAgg._sum.lineTotal ?? 0);
  const dailyMedicineSale = Number(dailyMedicineSaleAgg._sum.lineTotal ?? 0);
  const dailyPurchaseCost = Number(dailyPurchaseCostAgg._sum.totalAmount ?? 0);
  const totalFeedSale = Number(totalFeedSaleAgg._sum.lineTotal ?? 0);
  const totalMedicineSale = Number(totalMedicineSaleAgg._sum.lineTotal ?? 0);
  const totalPurchaseCost = Number(totalPurchaseCostAgg._sum.totalAmount ?? 0);
  const totalStock = Number(totalStockAgg._sum.quantityOnHand ?? 0);

  const revenueData = [
    { label: 'Jan', value: 65 },
    { label: 'Feb', value: 72 },
    { label: 'Mar', value: 80 },
    { label: 'Apr', value: 95 },
    { label: 'May', value: 88 },
    { label: 'Jun', value: 98 }
  ];

  const expenseData = [
    { label: 'Jan', value: 42 },
    { label: 'Feb', value: 55 },
    { label: 'Mar', value: 53 },
    { label: 'Apr', value: 68 },
    { label: 'May', value: 61 },
    { label: 'Jun', value: 75 }
  ];

  const maxRevenue = Math.max(...revenueData.map((item) => item.value));
  const maxExpense = Math.max(...expenseData.map((item) => item.value));

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
                  {[
                    { title: 'Daily Feed Sale', value: formatCurrency(dailyFeedSale), metric: '+ 2.3k', metricColor: 'text-emerald-600', icon: ShoppingCart, accent: 'bg-amber-50 text-amber-600' },
                    { title: 'Daily Medicine Sales', value: formatCurrency(dailyMedicineSale), metric: '+ 1.1k', metricColor: 'text-sky-600', icon: Box, accent: 'bg-violet-50 text-violet-600' },
                    { title: 'Today Cost', value: formatCurrency(dailyPurchaseCost), metric: '- 450', metricColor: 'text-rose-600', icon: Wallet, accent: 'bg-rose-50 text-rose-600' },
                    { title: 'Daily Stock', value: `${formatNumber(totalStock)} units`, metric: '+ 4.8%', metricColor: 'text-emerald-600', icon: BarChart3, accent: 'bg-sky-50 text-sky-600' }
                  ].map((item) => {
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
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    { title: 'Total Feed Sales', value: formatCurrency(totalFeedSale), metric: 'Stable', metricColor: 'text-slate-600', icon: ShoppingCart, accent: 'bg-indigo-50 text-indigo-600' },
                    { title: 'Total Medicine Sales', value: formatCurrency(totalMedicineSale), metric: '+ 3.2%', metricColor: 'text-emerald-600', icon: Box, accent: 'bg-violet-50 text-violet-600' },
                    { title: 'Total Cost', value: formatCurrency(totalPurchaseCost), metric: '- 1.7%', metricColor: 'text-rose-600', icon: Wallet, accent: 'bg-orange-50 text-orange-600' },
                    { title: 'Total Stock', value: `${formatNumber(totalStock)} units`, metric: '+ 8.9%', metricColor: 'text-emerald-600', icon: BarChart3, accent: 'bg-teal-50 text-teal-600' }
                  ].map((item) => {
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
            <Card className="bg-background p-6">
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
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>
            </Card>

            <Card className="bg-background p-6">
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
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <Card className="bg-background p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Recent Transactions</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Latest orders, payments, and status updates.</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/sales">See all</Link>
                </Button>
              </div>
              <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white/80 text-sm shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Name / Business</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {[
                      { name: 'Adam M', desc: 'Licensing Revenue', amount: '$750.00', status: 'Success' },
                      { name: 'Alexa Newsome', desc: 'Invoice #1908', amount: '-$90.99', status: 'Success' },
                      { name: 'Shelly Dorey', desc: 'Custom Software Development', amount: '$500.00', status: 'Success' },
                      { name: 'Fredrick Arnett', desc: 'Envato Payout - Collaboration', amount: '$1250.95', status: 'On hold' },
                      { name: 'Barbara Frink', desc: 'Personal Payment', amount: '-$90.99', status: 'Failed' }
                    ].map((item) => (
                      <tr key={item.name} className="hover:bg-slate-50">
                        <td className="px-4 py-4 font-medium text-slate-900">{item.name}</td>
                        <td className="px-4 py-4 text-slate-600">{item.desc}</td>
                        <td className="px-4 py-4 text-slate-900">{item.amount}</td>
                        <td className="px-4 py-4 text-slate-600">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <aside className="space-y-4">
              <Card className="bg-background p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Revenue Sources</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Top-performing channels by value.</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {[
                    { label: 'Online', revenue: '$187,232', value: '48.63%' },
                    { label: 'Offline', revenue: '$126,874', value: '36.08%' },
                    { label: 'Direct', revenue: '$90,127', value: '23.41%' }
                  ].map((item) => (
                    <RevenueSourceCard key={item.label} {...item} />
                  ))}
                </div>
              </Card>

              <Card className="bg-background p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Quick Actions</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Access your key modules instantly.</p>
                  </div>
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-6 grid gap-3">
                  {[
                    { label: 'Parties', href: '/dashboard/parties', icon: Users },
                    { label: 'Products', href: '/dashboard/products', icon: ShoppingCart },
                    { label: 'Stock', href: '/dashboard/stock', icon: Box },
                    { label: 'Sales', href: '/dashboard/sales', icon: CalendarDays },
                    { label: 'Purchases', href: '/dashboard/purchases', icon: ClipboardList },
                    { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 }
                  ].map((item) => {
                    const Icon = item.icon;
                    return <QuickActionItem key={item.label} label={item.label} href={item.href} icon={Icon} />;
                  })}
                </div>
              </Card>
            </aside>
          </div>
        </section>

        <section className="space-y-6 rounded-lg border bg-card p-6 shadow-sm md:p-8">
          <Card className="bg-background p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Analytics</p>
                <h2 className="mt-3 text-2xl font-semibold">Financial snapshot</h2>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-primary">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span>Monthly revenue</span>
                <span className="font-semibold text-slate-900">$32.4k</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span>Active parties</span>
                <span className="font-semibold text-slate-900">248</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span>Open invoices</span>
                <span className="font-semibold text-slate-900">18</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span>Stock alerts</span>
                <span className="font-semibold text-slate-900">7 low</span>
              </div>
            </div>
          </Card>

          <div className="rounded-lg border bg-background p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Team updates</p>
                <h2 className="mt-3 text-2xl font-semibold">Latest activity</h2>
              </div>
              <button className="text-sm font-medium text-primary hover:text-primary/80">Details</button>
            </div>
            <div className="mt-6 space-y-4 text-sm text-slate-700">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="font-medium">Sales order #2305 completed</p>
                <p className="mt-1 text-xs text-muted-foreground">4 min ago</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="font-medium">Stock alert for Layer Feed</p>
                <p className="mt-1 text-xs text-muted-foreground">12 min ago</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="font-medium">Payment received from Sample Customer</p>
                <p className="mt-1 text-xs text-muted-foreground">1 hr ago</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
