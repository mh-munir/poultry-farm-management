import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getPurchaseById, type PurchaseDetail } from '@/features/purchases/actions';
import { PrintButton } from '@/components/print-button';
import { getBranding } from '@/lib/branding';

function formatCurrency(value: number | string | Prisma.Decimal | null | undefined) {
  return `KSh ${Number(value?.toString() ?? 0).toFixed(2)}`;
}

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const purchase = (await getPurchaseById(Number(id))) as PurchaseDetail | null;

  if (!purchase) notFound();
  const branding = (await getBranding()) ?? { name: undefined, logo: undefined };

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="flex items-center justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {branding.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo} alt={branding.name ?? 'Brand logo'} className="h-16 w-16 rounded-lg object-contain" />
          ) : null}
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Purchase Invoice</p>
            <h1 className="mt-2 text-3xl font-semibold">{purchase.invoiceNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{purchase.party.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/purchases"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Invoice Date</p>
            <p>{new Date(purchase.transactionDate).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Status</p>
            <p>{purchase.status}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Due</p>
            <p>{formatCurrency(purchase.dueAmount)}</p>
          </div>
        </div>

        {purchase.dueDate && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-muted-foreground">Due Date</p>
            <p>{new Date(purchase.dueDate).toLocaleDateString()}</p>
          </div>
        )}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium">Qty</th>
                <th className="px-3 py-3 font-medium">Rate</th>
                <th className="px-3 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchase.transactionItems.map((item) => (
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
            <p>{purchase.notes ?? 'No notes provided.'}</p>
          </div>
          <div className="rounded-2xl border bg-background p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(purchase.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Discount</span>
              <span>{formatCurrency(purchase.discount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total</span>
              <span>{formatCurrency(purchase.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Paid</span>
              <span>{formatCurrency(purchase.paidAmount)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-base font-semibold">
              <span>Due</span>
              <span>{formatCurrency(purchase.dueAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
