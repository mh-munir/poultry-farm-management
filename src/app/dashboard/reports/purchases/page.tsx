import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getPurchasesReportData } from '@/features/reports/actions';
import { prisma } from '@/server/db';

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

export default async function PurchasesReportPage({
  searchParams
}: {
  searchParams?: Promise<{ from?: string; to?: string; party?: string; product?: string; type?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  const dateFrom = params?.from ? new Date(params.from + 'T00:00:00') : undefined;
  const dateTo = params?.to ? new Date(params.to + 'T00:00:00') : undefined;
  const partyId = params?.party ? Number(params.party) : undefined;
  const productId = params?.product ? Number(params.product) : undefined;
  const productType = params?.type || undefined;

  const [reportData, parties, products] = await Promise.all([
    getPurchasesReportData({ dateFrom, dateTo, partyId, productId, productType }),
    prisma.party.findMany({
      where: { partyType: { in: ['PARTY', 'COMPANY', 'BOTH'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, productType: true }
    })
  ]);

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Purchases Report</h1>
            <p className="mt-2 text-sm text-muted-foreground">Review party supplier and company invoices, purchase values, and stock acquisition history.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports">Back to Reports</Link>
          </Button>
        </div>

        <div className="mt-6">
          <form method="get" className="grid gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
              <input type="date" name="from" defaultValue={params?.from} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
              <input type="date" name="to" defaultValue={params?.to} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Party / Company</label>
              <select name="party" defaultValue={params?.party || ''} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">All parties / companies</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>{party.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Product</label>
              <select name="product" defaultValue={params?.product || ''} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">All products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
              <select name="type" defaultValue={params?.type || ''} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">All</option>
                <option value="FEED">Feed</option>
                <option value="MEDICINE">Medicine</option>
              </select>
            </div>
            <div className="md:col-span-5">
              <Button type="submit" size="sm">Apply Filters</Button>
            </div>
          </form>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(reportData.summary.total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{reportData.summary.count} transactions</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(reportData.summary.paid)}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Due</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(reportData.summary.due)}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-background p-4">
          <h3 className="text-lg font-semibold">Purchase Details</h3>
          {reportData.items.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No purchases found for the selected filters.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Party / Company</th>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-right font-medium">Quantity</th>
                    <th className="px-4 py-3 text-right font-medium">Buy Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Paid</th>
                    <th className="px-4 py-3 text-right font-medium">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">{formatDate(item.date)}</td>
                      <td className="px-4 py-3">{item.partyName}</td>
                      <td className="px-4 py-3">{item.productName}</td>
                      <td className="px-4 py-3">{item.productType}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.lineTotal)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.paid / reportData.summary.count || 0)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.due / reportData.summary.count || 0)}</td>
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
