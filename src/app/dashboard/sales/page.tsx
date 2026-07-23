import Link from 'next/link';
import { Plus, ArrowLeft, ClipboardList } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getCustomersForSales, getProductsForSales, getSalesPageData } from '@/features/sales/actions';
import { SaleForm } from './sale-form';

function formatCurrency(value: number | string | Prisma.Decimal | null | undefined) {
  return `KSh ${Number(value?.toString() ?? 0).toFixed(2)}`;
}

export default async function SalesPage({
  searchParams
}: {
  searchParams?: Promise<{ page?: string; search?: string; error?: string; success?: string }>;
}) {
  await requireUser();

  const params = await searchParams;
  const page = Number(params?.page ?? '1');
  const search = params?.search ?? '';
  const error = params?.error ?? '';
  const success = params?.success ?? '';

  const [data, products, customers] = await Promise.all([
    getSalesPageData({ page, search }),
    getProductsForSales(),
    getCustomersForSales()
  ]);
  const saleProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    code: product.code,
    defaultSellingPrice: Number(product.defaultSellingPrice ?? 0)
  }));

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Sales</p>
          <h1 className="mt-2 text-3xl font-semibold">Create invoices, track due payments, and update stock automatically</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Sell feed, medicine, or both, then print invoices and maintain customer ledger entries.
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

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><ClipboardList className="h-5 w-5" />New Sale</div>
          <SaleForm customers={customers} products={saleProducts} />
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5" />Recent Sales</div>
          <div className="space-y-3">
            {data.sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales found yet.</p>
            ) : (
              data.sales.map((sale) => (
                <div key={sale.id} className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{sale.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">{sale.party.name}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div>{formatCurrency(sale.totalAmount)}</div>
                      <div className="text-xs text-muted-foreground">Due {formatCurrency(sale.dueAmount)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
