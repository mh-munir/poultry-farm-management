import type { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { getStockPageData } from '@/features/stock/actions';

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
  const error = params?.error ?? '';
  const success = params?.success ?? '';

  const data = await getStockPageData({ page });

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Stock</h1>
            <p className="mt-2 text-sm text-muted-foreground">Manage feed and medicine inventory separately.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">Total Stock Value</div>
              <div className="text-primary">{data.products.reduce((total, product) => total + Number(product.stockBalance?.quantityOnHand ?? 0) * Number(product.defaultPurchasePrice ?? 0), 0).toLocaleString()} TK</div>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
            {error || success}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product Name</th>
                <th className="px-4 py-3 text-left font-medium">Quantity</th>
                <th className="px-4 py-3 text-left font-medium">Buy Rate</th>
                <th className="px-4 py-3 text-left font-medium">Sales Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {data.products.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No stock entries found.</td></tr> : data.products.map((product) => (
                <tr key={product.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.code}</div>
                  </td>
                  <td className="px-4 py-3">{formatQty(product.stockBalance?.quantityOnHand ?? 0)} {product.unit}</td>
                  <td className="px-4 py-3">{Number(product.defaultPurchasePrice ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">{Number(product.defaultSellingPrice ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
