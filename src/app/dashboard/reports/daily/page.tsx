import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { prisma } from '@/server/db';
import { getDailyReportData } from '@/features/reports/actions';

function formatCurrency(value: number) {
  return `৳ ${new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default async function DailyReportPage({
  searchParams
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const dateParam = params?.date;
  const selectedDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();

  const data = await getDailyReportData(selectedDate);

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Daily Report</h1>
            <p className="mt-2 text-sm text-muted-foreground">Review day-to-day sales, purchases, and stock movement at a glance.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports">Back to Reports</Link>
          </Button>
        </div>

        <div className="mt-6">
          <form method="get" className="flex items-center gap-3">
            <label className="text-sm font-medium">Select Date:</label>
            <input
              type="date"
              name="date"
              defaultValue={data.date}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
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
            <p className="text-sm text-muted-foreground">Total Costs</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.costs.total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.costs.count} expenses</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
            <p className={`mt-2 text-2xl font-semibold ${data.profit.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(data.profit.net)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Gross: {formatCurrency(data.profit.gross)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-background p-4">
            <h3 className="text-lg font-semibold">Sales Breakdown</h3>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Feed Sales</span>
                <span className="font-medium">{formatCurrency(data.sales.feedTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Medicine Sales</span>
                <span className="font-medium">{formatCurrency(data.sales.medicineTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paid</span>
                <span className="font-medium">{formatCurrency(data.sales.paid)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Due</span>
                <span className="font-medium">{formatCurrency(data.sales.due)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <h3 className="text-lg font-semibold">Purchases Breakdown</h3>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Feed Purchases</span>
                <span className="font-medium">{formatCurrency(data.purchases.feedTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Medicine Purchases</span>
                <span className="font-medium">{formatCurrency(data.purchases.medicineTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paid</span>
                <span className="font-medium">{formatCurrency(data.purchases.paid)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Due</span>
                <span className="font-medium">{formatCurrency(data.purchases.due)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-background p-4">
          <h3 className="text-lg font-semibold">Transactions</h3>
          {data.transactions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No transactions found for the selected date.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Party</th>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-right font-medium">Paid</th>
                    <th className="px-4 py-3 text-right font-medium">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.transactions.map((txn: any) => (
                    <tr key={txn.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">{formatDate(txn.transactionDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${txn.transactionType === 'SALE' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                          {txn.transactionType}
                        </span>
                      </td>
                      <td className="px-4 py-3">{txn.party?.name ?? '-'}</td>
                      <td className="px-4 py-3">
                        {txn.transactionItems?.map((item: any) => item.product?.name).join(', ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(txn.totalAmount))}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(txn.paidAmount))}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(txn.dueAmount))}</td>
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
