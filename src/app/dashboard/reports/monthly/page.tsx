import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getMonthlyReportData } from '@/features/reports/actions';

function formatCurrency(value: number) {
  return `৳ ${new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`;
}

export default async function MonthlyReportPage({
  searchParams
}: {
  searchParams?: Promise<{ month?: string; year?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const now = new Date();
  const month = Number(params?.month ?? now.getMonth() + 1);
  const year = Number(params?.year ?? now.getFullYear());

  const data = await getMonthlyReportData(year, month);

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Monthly Report</h1>
            <p className="mt-2 text-sm text-muted-foreground">Summarize monthly performance with trend-focused business insights.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports">Back to Reports</Link>
          </Button>
        </div>

        <div className="mt-6">
          <form method="get" className="flex items-center gap-3">
            <label className="text-sm font-medium">Month:</label>
            <select name="month" defaultValue={String(month)} className="rounded-md border bg-background px-3 py-2 text-sm">
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((name, idx) => (
                <option key={name} value={String(idx + 1)}>{name}</option>
              ))}
            </select>
            <label className="text-sm font-medium">Year:</label>
            <input type="number" name="year" defaultValue={String(year)} className="rounded-md border bg-background px-3 py-2 text-sm" />
            <Button type="submit" size="sm">View Report</Button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.sales.total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.sales.count} transactions</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.purchases.total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.purchases.count} transactions</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.costs.total)}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
            <p className={`mt-2 text-2xl font-semibold ${data.profit.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(data.profit.net)}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-background p-4">
          <h3 className="text-lg font-semibold">Daily Breakdown</h3>
          {data.dailyBreakdown.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No data available for this month.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Sales</th>
                    <th className="px-4 py-3 text-right font-medium">Purchases</th>
                    <th className="px-4 py-3 text-right font-medium">Expenses</th>
                    <th className="px-4 py-3 text-right font-medium">Profit/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.dailyBreakdown.map((day) => (
                    <tr key={day.date} className="hover:bg-muted/30">
                      <td className="px-4 py-3">{day.date}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(day.sales)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(day.purchases)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(day.costs)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${day.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(day.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
