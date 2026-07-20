import Link from 'next/link';
import { Plus, ArrowLeft, Package2, AlertTriangle, History, Boxes } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createStockMovement, getLowStockAlerts, getProductsForStock, getStockHistory, getStockPageData } from '@/features/stock/actions';

function formatQty(value: number | string | Prisma.Decimal | null | undefined) {
  return Number(value?.toString() ?? 0).toFixed(2);
}

export default async function StockPage({
  searchParams
}: {
  searchParams?: Promise<{ page?: string; search?: string; lowStockOnly?: string; error?: string; success?: string }>;
}) {
  await requireUser();

  const params = await searchParams;
  const page = Number(params?.page ?? '1');
  const search = params?.search ?? '';
  const lowStockOnly = params?.lowStockOnly === '1';
  const error = params?.error ?? '';
  const success = params?.success ?? '';

  const [data, history, alerts, products] = await Promise.all([getStockPageData({ page, search, lowStockOnly }), getStockHistory(), getLowStockAlerts(), getProductsForStock()]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Stock Management</p>
          <h1 className="mt-2 text-3xl font-semibold">Track stock in, stock out, and adjustments</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Maintain safe inventory levels with transactional updates and low stock alerts.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link>
        </Button>
      </div>

      {(error || success) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {error || success}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Boxes className="h-5 w-5" />Current Stock</div>
          <form autoComplete="off" className="flex flex-col gap-3 md:flex-row md:items-end" method="get">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium">Search</label>
              <input name="search" defaultValue={search} placeholder="Search by product name or code" className="w-full rounded-md border bg-background px-3 py-2" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="lowStockOnly" value="1" defaultChecked={lowStockOnly} />
              Low stock only
            </label>
            <Button type="submit">Apply</Button>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">On Hand</th>
                  <th className="px-3 py-3 font-medium">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {data.products.length === 0 ? <tr><td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">No stock entries found.</td></tr> : data.products.map((product) => (
                  <tr key={product.id} className="border-t">
                    <td className="px-3 py-3">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.code}</div>
                    </td>
                    <td className="px-3 py-3">{product.category?.name ?? '—'}</td>
                    <td className="px-3 py-3">{formatQty(product.stockBalance?.quantityOnHand ?? 0)} {product.unit}</td>
                    <td className="px-3 py-3">{formatQty(product.lowStockThreshold ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5" />Record Stock Movement</div>
          <form action={createStockMovement} autoComplete="off" className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Product</label>
              <select name="productId" className="w-full rounded-md border bg-background px-3 py-2">
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.code})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Movement type</label>
              <select name="movementType" defaultValue="ADJUSTMENT" className="w-full rounded-md border bg-background px-3 py-2">
                <option value="PURCHASE">Stock In</option>
                <option value="SALE">Stock Out</option>
                <option value="ADJUSTMENT">Stock Adjustment</option>
                <option value="RETURN">Return</option>
                <option value="WASTAGE">Wastage</option>
                <option value="PRODUCTION">Production</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Adjustment direction</label>
              <select name="adjustmentMode" defaultValue="INCREASE" className="w-full rounded-md border bg-background px-3 py-2">
                <option value="INCREASE">Increase stock</option>
                <option value="DECREASE">Decrease stock</option>
              </select>
              <p className="mt-2 text-xs text-muted-foreground">Use this only when recording a stock adjustment. It is ignored for stock in/out entries.</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Quantity</label>
              <input type="number" step="0.01" min="0" name="quantity" defaultValue="1" className="w-full rounded-md border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Unit cost</label>
              <input type="number" step="0.01" min="0" name="unitCost" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Notes</label>
              <textarea name="notes" rows={3} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Optional notes" />
            </div>
            <Button type="submit" className="w-full">Save Movement</Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5" />Low Stock Alerts</div>
          <div className="space-y-3">
            {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No low stock alerts.</p> : alerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border bg-background p-3">
                <div className="font-medium">{alert.name}</div>
                <div className="text-sm text-muted-foreground">{alert.code} • On hand {formatQty(alert.stockBalance?.quantityOnHand ?? 0)} {alert.unit}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><History className="h-5 w-5" />Stock History</div>
          <div className="space-y-3">
            {history.length === 0 ? <p className="text-sm text-muted-foreground">No stock history yet.</p> : history.map((entry) => (
              <div key={entry.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{entry.product.name}</div>
                    <div className="text-xs text-muted-foreground">{entry.movementType}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{entry.quantity.toString()}</div>
                    <div className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
