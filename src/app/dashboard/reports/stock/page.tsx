import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import Link from 'next/link';
import { getStockReportData } from '@/features/reports/actions';

function formatCurrency(value: number) {
  return `৳ ${new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`;
}

export default async function StockReportPage({
  searchParams
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const productType = params?.type || undefined;

  const data = await getStockReportData({ productType });

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Stock Report</h1>
            <p className="mt-2 text-sm text-muted-foreground">Analyze inventory availability, movement, and low-stock positions.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports">Back to Reports</Link>
          </Button>
        </div>

        <div className="mt-6">
          <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm font-medium">Filter:</label>
            <select name="type" defaultValue={params?.type || ''} className="rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">All</option>
              <option value="FEED">Feed</option>
              <option value="MEDICINE">Medicine</option>
            </select>
            <Button type="submit" size="sm">Apply Filter</Button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="mt-2 text-2xl font-semibold">{data.items.length}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Inventory Value</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.totalValue)}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Low Stock Items</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600">{data.lowStockCount}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-background p-4">
          <h3 className="text-lg font-semibold">Stock Details</h3>
          {data.items.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No stock items found.</p>
          ) : (
            <ResponsiveTable className="mt-4" minWidth="900px">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Current Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Total In</th>
                    <th className="px-4 py-3 text-right font-medium">Total Out</th>
                    <th className="px-4 py-3 text-right font-medium">Balance</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.productType === 'FEED' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                          {item.productType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantityOnHand} {item.unit}</td>
                      <td className="px-4 py-3 text-right">{item.totalIn}</td>
                      <td className="px-4 py-3 text-right">{item.totalOut}</td>
                      <td className="px-4 py-3 text-right">{item.balance}</td>
                      <td className="px-4 py-3">
                        {item.lowStock ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Low Stock</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">In Stock</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </div>
      </div>
    </main>
  );
}
