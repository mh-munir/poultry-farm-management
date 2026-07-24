import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import PrintTrigger from './print-trigger';
import { getBranding } from '@/lib/branding';

function formatCurrency(value: number | string | { toString(): string } | null | undefined) {
  const number = Number(value?.toString() ?? 0);
  return `৳ ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)}`;
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default async function PartyPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const partyId = Number(id);

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) notFound();
  const branding = (await getBranding()) ?? { name: undefined, logo: undefined };

  const [transactions, payments] = await Promise.all([
    prisma.transaction.findMany({
      where: { partyId },
      orderBy: { transactionDate: 'desc' },
      include: { transactionItems: { include: { product: true } } }
    }),
    prisma.payment.findMany({ where: { partyId }, orderBy: { paymentDate: 'desc' } })
  ]);

  const productRows = transactions.flatMap((transaction) =>
    transaction.transactionItems.map((item) => ({
      id: `${transaction.id}-${item.id}`,
      transactionId: transaction.id,
      transactionType: transaction.transactionType,
      transactionDate: transaction.transactionDate,
      invoiceNumber: transaction.invoiceNumber,
      productName: item.product?.name ?? 'Unknown product',
      quantity: Number(item.quantity ?? 0),
      unit: item.product?.unit ?? '—',
      unitPrice: Number(item.unitPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0)
    }))
  );

  const customerRows = productRows.filter((r) => r.transactionType === 'SALE');
  const supplierRows = productRows.filter((r) => r.transactionType === 'PURCHASE');

  // compute totals
  const totalSales = customerRows.reduce((s, r) => s + (r.lineTotal ?? 0), 0);
  const totalSupplies = supplierRows.reduce((s, r) => s + (r.lineTotal ?? 0), 0);
  const totalPayments = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PrintTrigger />
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Party Print — {party.name}</h1>
          <p className="text-sm text-muted-foreground">Phone: {party.phone ?? '—'}</p>
        </div>
        {branding.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logo} alt={branding.name ?? 'Brand logo'} className="h-20 w-20 rounded-lg object-contain" />
        ) : null}
      </header>

      <section className="mb-6">
        <h2 className="text-lg font-medium">Summary</h2>
        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
          <div>Total sales: {formatCurrency(totalSales)}</div>
          <div>Total supplies: {formatCurrency(totalSupplies)}</div>
          <div>Total payments: {formatCurrency(totalPayments)}</div>
          <div>Net balance: {formatCurrency(totalSales - totalPayments - totalSupplies)}</div>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium">Sales</h3>
        <table className="w-full text-sm mt-2 border-collapse">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2">Date</th>
              <th className="py-2">Invoice</th>
              <th className="py-2">Product</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Unit</th>
              <th className="py-2">Line total</th>
            </tr>
          </thead>
          <tbody>
            {customerRows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2">{formatDate(r.transactionDate)}</td>
                <td className="py-2">{r.invoiceNumber ?? '—'}</td>
                <td className="py-2">{r.productName}</td>
                <td className="py-2">{r.quantity}</td>
                <td className="py-2">{r.unit}</td>
                <td className="py-2">{formatCurrency(r.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h3 className="font-medium">Supplies</h3>
        <table className="w-full text-sm mt-2 border-collapse">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2">Date</th>
              <th className="py-2">Invoice</th>
              <th className="py-2">Product</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Unit</th>
              <th className="py-2">Line total</th>
            </tr>
          </thead>
          <tbody>
            {supplierRows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2">{formatDate(r.transactionDate)}</td>
                <td className="py-2">{r.invoiceNumber ?? '—'}</td>
                <td className="py-2">{r.productName}</td>
                <td className="py-2">{r.quantity}</td>
                <td className="py-2">{r.unit}</td>
                <td className="py-2">{formatCurrency(r.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h3 className="font-medium">Payments</h3>
        <table className="w-full text-sm mt-2 border-collapse">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2">Date</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Method</th>
              <th className="py-2">Reference</th>
              <th className="py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{formatDate(p.paymentDate)}</td>
                <td className="py-2">{formatCurrency(p.amount)}</td>
                <td className="py-2">{p.paymentMethod}</td>
                <td className="py-2">{p.referenceNumber ?? '—'}</td>
                <td className="py-2">{p.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
