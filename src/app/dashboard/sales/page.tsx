import Link from 'next/link';
import { Plus, ArrowLeft, ClipboardList, DollarSign } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createSaleTransaction, getCustomersForSales, getProductsForSales, getSalesPageData } from '@/features/sales/actions';

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
          <form action={createSaleTransaction} autoComplete="off" className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Customer</label>
              <select name="partyId" required className="w-full rounded-md border bg-background px-3 py-2">
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Discount</label>
                <input type="number" step="0.01" min="0" name="discount" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Payment amount</label>
                <input type="number" step="0.01" min="0" name="paymentAmount" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Payment method</label>
              <select name="paymentMethod" className="w-full rounded-md border bg-background px-3 py-2">
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="MOBILE_MONEY">Mobile money</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Reference number</label>
              <input name="referenceNumber" className="w-full rounded-md border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Notes</label>
              <textarea name="notes" rows={3} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Invoice notes or remarks" />
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="mb-3 text-sm font-semibold">Items</div>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
                  <select name="productId" className="rounded-md border bg-background px-3 py-2">
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name} ({product.code})</option>
                    ))}
                  </select>
                  <input type="number" step="0.01" min="0" name="quantity" defaultValue="1" placeholder="Qty" className="rounded-md border bg-background px-3 py-2" />
                  <input type="number" step="0.01" min="0" name="unitPrice" defaultValue="0" placeholder="Price" className="rounded-md border bg-background px-3 py-2" />
                  <input name="description" placeholder="Description" className="rounded-md border bg-background px-3 py-2" />
                </div>
              ))}
            </div>
            <Button type="submit" className="w-full"><DollarSign className="mr-2 h-4 w-4" />Save Sale</Button>
          </form>
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
