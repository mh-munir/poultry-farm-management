import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getProfitLossReportData } from '@/features/reports/actions';

function formatCurrency(value: number) {
  return `৳ ${new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`;
}

export default async function ProfitLossReportPage({
  searchParams
}: {
  searchParams?: Promise<{ from?: string; to?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  const dateFrom = params?.from ? new Date(params.from + 'T00:00:00') : undefined;
  const dateTo = params?.to ? new Date(params.to + 'T00:00:00') : undefined;

  const data = await getProfitLossReportData(dateFrom, dateTo);

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Profit & Loss Report</h1>
            <p className="mt-2 text-sm text-muted-foreground">Measure profitability with gross margin and expense summaries.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports">Back to Reports</Link>
          </Button>
        </div>

        <div className="mt-6">
          <form method="get" className="flex items-center gap-3">
            <label className="text-sm font-medium">From:</label>
            <input type="date" name="from" defaultValue={params?.from} className="rounded-md border bg-background px-3 py-2 text-sm" />
            <label className="text-sm font-medium">To:</label>
            <input type="date" name="to" defaultValue={params?.to} className="rounded-md border bg-background px-3 py-2 text-sm" />
            <Button type="submit" size="sm">View Report</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Period: {data.period.from} to {data.period.to}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-background p-4">
            <h3 className="text-lg font-semibold">Revenue</h3>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Sales</span>
                <span className="font-medium">{formatCurrency(data.revenue.totalSales)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <h3 className="text-lg font-semibold">Expenses</h3>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Purchase Costs</span>
                <span className="font-medium">{formatCurrency(data.costs.purchases)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Operating Expenses</span>
                <span className="font-medium">{formatCurrency(data.costs.operating)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span>Total Expenses</span>
                <span>{formatCurrency(data.costs.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Gross Profit/Loss</p>
            <p className={`mt-2 text-2xl font-semibold ${data.profit.gross >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(data.profit.gross)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Sales minus Purchase Costs</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
            <p className={`mt-2 text-2xl font-semibold ${data.profit.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(data.profit.net)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Gross Profit minus Operating Expenses</p>
          </div>
        </div>
      </div>
    </main>
  );
}
