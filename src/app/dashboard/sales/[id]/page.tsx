import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getSaleById } from '@/features/sales/actions';
import { PrintButton } from '@/components/print-button';

function formatCurrency(value: number | string | null | undefined) {
  return `KSh ${Number(value ?? 0).toFixed(2)}`;
}

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const sale = await getSaleById(Number(id));

  if (!sale) notFound();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Invoice</p>
          <h1 className="mt-2 text-3xl font-semibold">{sale.invoiceNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sale.party.name}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/sales"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Invoice Date</p>
            <p>{new Date(sale.transactionDate).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Status</p>
            <p>{sale.status}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Due</p>
            <p>{formatCurrency(sale.dueAmount)}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium">Qty</th>
                <th className="px-3 py-3 font-medium">Unit price</th>
                <th className="px-3 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.transactionItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-3">{item.product.name}</td>
                  <td className="px-3 py-3">{item.quantity.toString()} {item.product.unit}</td>
                  <td className="px-3 py-3">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-3 py-3">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Notes</p>
            <p>{sale.notes ?? 'No notes provided.'}</p>
          </div>
          <div className="rounded-2xl border bg-background p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Discount</span>
              <span>{formatCurrency(sale.discount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total</span>
              <span>{formatCurrency(sale.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Paid</span>
              <span>{formatCurrency(sale.paidAmount)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-base font-semibold">
              <span>Due</span>
              <span>{formatCurrency(sale.dueAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
