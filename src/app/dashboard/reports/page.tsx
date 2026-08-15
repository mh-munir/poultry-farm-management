import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getReportSummary } from '@/features/reports/actions';
import { BarChart3 } from 'lucide-react';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { getDictionary } from '@/i18n';

const reportConfig = [
  {
    title: 'Daily',
    description: 'Review day-to-day sales, purchases, and stock movement at a glance.',
    badge: 'Daily',
    href: '/dashboard/reports/daily'
  },
  {
    title: 'Monthly',
    description: 'Summarize monthly performance with trend-focused business insights.',
    badge: 'Monthly',
    href: '/dashboard/reports/monthly'
  },
  {
    title: 'Yearly',
    description: 'Track annual growth across revenue, expenses, and inventory turnover.',
    badge: 'Yearly',
    href: '/dashboard/reports/yearly'
  },
  {
    title: 'Sales',
    description: 'Monitor invoice summaries, sales trends, and customer-level performance.',
    badge: 'Sales',
    href: '/dashboard/reports/sales'
  },
  {
    title: 'Purchases',
    description: 'Review party supplier and company invoices, purchase values, and stock acquisition history.',
    badge: 'Purchases',
    href: '/dashboard/reports/purchases'
  },
  {
    title: 'Party Statement',
    description: 'Present outstanding balances and transaction history for each party.',
    badge: 'Ledger',
    href: '/dashboard/reports/party-statement'
  },
  {
    title: 'Stock',
    description: 'Analyze inventory availability, movement, and low-stock positions.',
    badge: 'Inventory',
    href: '/dashboard/reports/stock'
  },
  {
    title: 'Profit & Loss',
    description: 'Measure profitability with gross margin and expense summaries.',
    badge: 'Finance',
    href: '/dashboard/reports/profit-loss'
  }
] as const;

function formatCurrency(value: number) {
  return `৳ ${new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)}`;
}

export default async function ReportsPage() {
  const session = await requireUser();
  const cookieStore = await cookies();
  const locale = getLocaleFromValue(cookieStore.get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);
  const userName = session.user.name ?? session.user.email ?? 'there';

  const summary = await getReportSummary();

  const reportStats = {
    'Daily': `${formatCurrency(summary.daily.sales)} sales today`,
    'Monthly': `${formatCurrency(summary.monthly.sales)} sales this month`,
    'Yearly': `${formatCurrency(summary.yearly.sales)} sales this year`,
    'Sales': formatCurrency(summary.yearly.sales),
    'Purchases': formatCurrency(summary.purchases.total),
    'Party Statement': `${summary.transactions.total} transactions`,
    'Stock': `${summary.stock.lowStockCount} low stock`,
    'Profit & Loss': formatCurrency(summary.yearly.sales - summary.purchases.total)
  };

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4 sm:px-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.nav.reports}</p>
            <h1 className="mt-2 text-3xl font-semibold">{dict.reports.reportsCenter}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {dict.common.welcomeBackUser.replace('{{name}}', userName)} {dict.reports.exportAndPrintDescription}
            </p>
          </div>
          <div className="rounded-full border bg-background px-4 py-2 text-sm text-muted-foreground">
            {dict.reports.financeOperations}
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {reportConfig.map((report) => (
          <div key={report.title} className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{report.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {report.badge}
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm font-semibold text-primary">
                {reportStats[report.title as keyof typeof reportStats]}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{dict.common.operational}</span>
                <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{dict.common.ready}</span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={report.href}>{dict.common.openReport}</Link>
            </Button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{dict.common.exportAndPrint}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {dict.common.exportAndPrintDescription}
            </p>
          </div>
          <div className="rounded-full border bg-background p-2 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" className="w-full sm:w-auto">{dict.reports.exportPdf}</Button>
          <Button variant="outline" className="w-full sm:w-auto">{dict.reports.exportExcel}</Button>
          <Link href="/dashboard/reports/party-statement" className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            {dict.reports.printReports}
          </Link>
        </div>
      </div>
    </main>
  );
}
