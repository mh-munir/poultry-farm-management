import Link from 'next/link';
import { CalendarDays, MapPin, Package2, Pencil, Phone, ReceiptText, Wallet2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { prisma } from '@/server/db';
import { deletePaymentForParty, getPartyAccountSummary, recordPaymentForParty, updatePaymentForParty } from '@/features/parties/actions';
import PaymentFormDialog from './payment-form-dialog';
import { PartyPaymentsSection } from './party-payments-section';
import ToastRedirect from '../toast-redirect';

type PartyProfileRecord = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  partyType: string;
  taxNumber: string | null;
  creditLimit: { toString(): string } | null;
  openingBalance: { toString(): string };
  feedQuantity: { toString(): string } | null;
  feedPrice: { toString(): string } | null;
  feedName: string | null;
  medicineQuantity: { toString(): string } | null;
  medicinePrice: { toString(): string } | null;
  imageUrl: string | null;
  mediaName: string | null;
  farmName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PartyTransactionRecord = {
  id: number;
  transactionType: string;
  transactionDate: Date;
  invoiceNumber: string;
  totalAmount: { toString(): string };
  paidAmount: { toString(): string };
  dueAmount: { toString(): string };
  transactionItems: Array<{
    id: number;
    quantity: { toString(): string };
    unitPrice: { toString(): string };
    lineTotal: { toString(): string };
    product: {
      name: string;
      unit: string;
      productType: string;
    } | null;
  }>;
};

type PartyPaymentRecord = {
  id: number;
  amount: { toString(): string };
  paymentDate: Date;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
  notes: string | null;
};

function formatCurrency(value: number | string | { toString(): string } | null | undefined) {
  const number = Number(value?.toString() ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2
  }).format(number);
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default async function PartyProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ success?: string; error?: string }> }) {
  await requireUser();
  const { id } = await params;
  const partyId = Number(id);
  const sp = await searchParams;
  const success = sp?.success ?? '';
  const error = sp?.error ?? '';

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      partyType: true,
      taxNumber: true,
      creditLimit: true,
      openingBalance: true,
      feedQuantity: true,
      feedPrice: true,
      feedName: true,
      medicineQuantity: true,
      medicinePrice: true,
      imageUrl: true,
      mediaName: true,
      farmName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  }) as PartyProfileRecord | null;

  if (!party) notFound();

  const [transactions, payments, summary] = await Promise.all([
    prisma.transaction.findMany({
      where: { partyId },
      orderBy: { transactionDate: 'desc' },
      select: {
        id: true,
        transactionType: true,
        transactionDate: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        transactionItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            product: {
              select: {
                name: true,
                unit: true,
                productType: true
              }
            }
          }
        }
      }
    }) as Promise<PartyTransactionRecord[]>,
    prisma.payment.findMany({
      where: { partyId },
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        paymentMethod: true,
        referenceNumber: true,
        status: true,
        notes: true
      }
    }) as Promise<PartyPaymentRecord[]>,
    getPartyAccountSummary(partyId)
  ]);

  const { totalInvoiced, totalPaid, totalDue } = summary;
  const totalPaymentsRecorded = totalPaid;
  const dueStatus = totalDue <= 0 ? 'Cleared' : totalPaid > 0 ? 'Partial' : 'Pending';
  const dueBadgeClass = totalDue <= 0 ? 'bg-emerald-100 text-emerald-700' : totalPaid > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';

  const productRows = transactions.flatMap((transaction) =>
    transaction.transactionItems.map((item) => ({
      id: `${transaction.id}-${item.id}`,
      invoiceNumber: transaction.invoiceNumber,
      transactionDate: transaction.transactionDate,
      transactionType: transaction.transactionType,
      productName: item.product?.name ?? 'Unknown product',
      productType: item.product?.productType ?? '—',
      quantity: Number(item.quantity ?? 0),
      unit: item.product?.unit ?? '—',
      unitPrice: Number(item.unitPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0)
    }))
  );

  const exportCsv = [
    ['Party Profile', party.name],
    ['Phone', party.phone],
    ['Address', party.address ?? ''],
    ['Farm Name', party.farmName ?? ''],
    ['Party Type', party.partyType],
    ['Opening Balance', formatCurrency(Number(party.openingBalance ?? 0))],
    ['Total Invoiced', formatCurrency(totalInvoiced)],
    ['Total Paid', formatCurrency(totalPaid)],
    ['Total Due', formatCurrency(totalDue)],
    [],
    ['Payment History'],
    ['Date', 'Amount', 'Method', 'Reference', 'Status', 'Notes'],
    ...payments.map((payment) => [formatDate(payment.paymentDate), formatCurrency(payment.amount), payment.paymentMethod, payment.referenceNumber ?? '', payment.status, payment.notes ?? ''])
  ]
    .map((row) => row.join(','))
    .join('\n');

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <ToastRedirect initialSuccess={success ?? undefined} initialError={error ?? undefined} />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
                {party.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={party.imageUrl} alt={party.name} className="h-24 w-24 rounded-full border object-cover shadow-md" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border bg-muted text-3xl font-semibold text-muted-foreground">
                    {party.name.charAt(0).toUpperCase()}
                  </div>
                )}
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Party Profile</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight">{party.name}</h1>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-background p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="h-4 w-4" /> Mobile Phone
              </div>
              <p className="mt-2 text-base font-semibold">{party.phone ?? '—'}</p>
            </div>
            <div className="rounded-xl border bg-background p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Package2 className="h-4 w-4" /> Farm name
              </div>
              <p className="mt-2 text-base font-semibold">{party.farmName ?? '—'}</p>
            </div>
            <div className="rounded-xl border bg-background p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" /> Address
              </div>
              <p className="mt-2 text-base font-semibold">{party.address ?? '—'}</p>
            </div>
            <div className="rounded-xl border bg-background p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ReceiptText className="h-4 w-4" /> Opening balance
              </div>
              <p className="mt-2 text-base font-semibold">{formatCurrency(Number(party.openingBalance ?? 0))}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <PaymentFormDialog partyId={party.id} recordPaymentForParty={recordPaymentForParty} />
            <Button asChild>
              <Link href={`/dashboard/parties/${party.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Party
              </Link>
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Payment & due</h2>
              <p className="mt-1 text-xs text-muted-foreground">Quick summary of the party account</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${dueBadgeClass}`}>{dueStatus}</span>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="rounded-xl border bg-background p-4 flex flex-col">
              <div className="text-muted-foreground">Total invoiced</div>
              <div className="mt-1 font-semibold text-lg">{formatCurrency(totalInvoiced)}</div>
            </div>
            <div className="rounded-xl border bg-background p-4 flex flex-col">
              <div className="text-muted-foreground">Total paid</div>
              <div className="mt-1 font-semibold text-lg">{formatCurrency(totalPaid)}</div>
            </div>
            <div className="rounded-xl border bg-background p-4 flex flex-col">
              <div className="text-muted-foreground">Total due</div>
              <div className="mt-1 font-semibold text-lg">{formatCurrency(totalDue)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Auto-calculated from invoice totals and payments</div>
            </div>
            <div className="rounded-xl border bg-background p-4 flex flex-col">
              <div className="text-muted-foreground">Payments recorded</div>
              <div className="mt-1 font-semibold text-lg">{formatCurrency(totalPaymentsRecorded)}</div>
            </div>
          </div>
        </section>
      </div>


      <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Product-wise entries</h2>
            <p className="mt-1 text-sm text-muted-foreground">Each transaction item appears as its own row so multiple entries are visible clearly.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2 text-sm font-medium">
              <Wallet2 className="h-4 w-4" />
              {productRows.length} entries
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border">
          <div className="bg-muted/40 px-4 py-3 text-sm font-semibold">Products taken from me</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/10 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Unit price</th>
                  <th className="px-4 py-3 font-medium">Line total</th>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {productRows.length > 0 ? (
                  productRows.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">{row.productName}</td>
                      <td className="px-4 py-3">{row.productType}</td>
                      <td className="px-4 py-3">{row.quantity}</td>
                      <td className="px-4 py-3">{row.unit}</td>
                      <td className="px-4 py-3">{formatCurrency(row.unitPrice)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.lineTotal)}</td>
                      <td className="px-4 py-3">{row.invoiceNumber}</td>
                      <td className="px-4 py-3">{formatDate(row.transactionDate)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t">
                    <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No product entries available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
          <div className="mt-6">
          <PartyPaymentsSection
            partyId={party.id}
            initialPayments={payments.map((payment) => ({
              id: payment.id,
              amount: payment.amount.toString(),
              paymentDate: payment.paymentDate.toISOString(),
              paymentMethod: payment.paymentMethod,
              referenceNumber: payment.referenceNumber,
              status: payment.status,
              notes: payment.notes
            }))}
            recordPaymentForParty={recordPaymentForParty}
            updatePaymentForParty={updatePaymentForParty}
            deletePaymentForParty={deletePaymentForParty}
            showForm={false}
          />
        </div>
      </section>
    </main>
  );
}
