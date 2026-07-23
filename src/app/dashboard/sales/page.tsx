import Link from 'next/link';
import { Plus, ArrowLeft, ClipboardList, Package2 } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getCustomersForSales, getProductsForSales, getSalesPageData } from '@/features/sales/actions';
import { SaleForm } from './sale-form';

function formatCurrency(value: number | string | Prisma.Decimal | null | undefined) {
  return `KSh ${Number(value?.toString() ?? 0).toFixed(2)}`;
}

function formatStock(value: number | string | Prisma.Decimal | null | undefined) {
  return `${Number(value?.toString() ?? 0).toFixed(2)}`;
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

      {/* Available Products for Sale/Purchase */}
      <div className="mt-8 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Package2 className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Available Products Inventory</h2>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
            <Package2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">No products available yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Create products from the Products section to display them here</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/products/new">Create Product</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Product Name</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Stock Available</th>
                  <th className="px-4 py-3 font-medium">Selling Price</th>
                  <th className="px-4 py-3 font-medium">Purchase Price</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stock = Number(product.stockBalance?.quantityOnHand ?? 0);
                  const stockClass = stock > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
                  
                  return (
                    <tr key={product.id} className="border-t hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{product.code}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {product.productType}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${stockClass}`}>
                        {formatStock(stock)}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(product.defaultSellingPrice)}</td>
                      <td className="px-4 py-3">{formatCurrency(product.defaultPurchasePrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
