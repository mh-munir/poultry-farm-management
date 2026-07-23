import { MapPin, Package2, Phone, ReceiptText, Wallet2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { deletePaymentForParty, getPartyAccountSummary, recordPaymentForParty, updatePaymentForParty } from '@/features/parties/actions';
import PaymentFormDialog from './payment-form-dialog';
import { PartyPaymentsSection } from './party-payments-section';
import ToastRedirect from '../toast-redirect';
import { PartyRowActions } from '../party-row-actions';

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
  const customerProductRows = productRows.filter((row) => row.transactionType === 'SALE');
  const supplierProductRows = productRows.filter((row) => row.transactionType === 'PURCHASE');
  const showCustomerTable = party.partyType === 'CUSTOMER' || party.partyType === 'BOTH';
  const showSupplierTable = party.partyType === 'SUPPLIER' || party.partyType === 'BOTH';
  const visibleEntryCount = (showCustomerTable ? customerProductRows.length : 0) + (showSupplierTable ? supplierProductRows.length : 0);
  const netBalanceAmount = party.partyType === 'SUPPLIER' ? summary.supplierDue : summary.netCustomerDue;
  const netBalanceLabel = party.partyType === 'SUPPLIER'
    ? 'Supplier payable'
    : summary.netSupplierDue > 0
      ? 'We owe supplier'
      : 'Customer due';
  const dueStatus = summary.netSupplierDue > 0 && party.partyType !== 'CUSTOMER'
    ? 'Payable'
    : netBalanceAmount <= 0
      ? 'Cleared'
      : summary.totalPaid > 0
        ? 'Partial'
        : 'Pending';
  const dueBadgeClass = dueStatus === 'Cleared'
    ? 'bg-emerald-100 text-emerald-700'
    : dueStatus === 'Partial'
      ? 'bg-amber-100 text-amber-700'
      : dueStatus === 'Payable'
        ? 'bg-sky-100 text-sky-700'
        : 'bg-rose-100 text-rose-700';

  const exportCsv = [
    ['Party Profile', party.name],
    ['Phone', party.phone],
    ['Address', party.address ?? ''],
    ['Farm Name', party.farmName ?? ''],
    ['Party Type', party.partyType],
    ['Opening Balance', formatCurrency(Number(party.openingBalance ?? 0))],
    ['Customer Sales', formatCurrency(summary.customerInvoiced)],
    ['Customer Paid', formatCurrency(summary.customerPaid)],
    ['Customer Due Before Offset', formatCurrency(summary.customerDue)],
    ['Supplier Supplies', formatCurrency(summary.supplierInvoiced)],
    ['Supplier Paid', formatCurrency(summary.supplierPaid)],
    ['Supplier Payable Before Offset', formatCurrency(summary.supplierDue)],
    ['Offset Applied', formatCurrency(summary.offsetApplied)],
    ['Net Customer Due', formatCurrency(summary.netCustomerDue)],
    ['Net Supplier Payable', formatCurrency(summary.netSupplierDue)],
    [],
    ['Payment History'],
    ['Date', 'Amount', 'Method', 'Reference', 'Status', 'Notes'],
    ...payments.map((payment) => [formatDate(payment.paymentDate), formatCurrency(payment.amount), payment.paymentMethod, payment.referenceNumber ?? '', payment.status, payment.notes ?? ''])
  ]
    .map((row) => row.join(','))
    .join('\n');

  const renderProductTable = (
    title: string,
    rows: typeof productRows,
    emptyMessage: string
  ) => (
    <div className="mt-6 overflow-hidden rounded-xl border">
      <div className="bg-muted/40 px-4 py-3 text-sm font-semibold">{title}</div>
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
            {rows.length > 0 ? (
              rows.map((row) => (
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
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

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
            <PartyRowActions
              editOnly
              party={{
                id: party.id,
                name: party.name,
                phone: party.phone ?? '',
                email: party.email,
                address: party.address,
                partyType: party.partyType,
                taxNumber: party.taxNumber,
                creditLimit: party.creditLimit?.toString() ?? null,
                openingBalance: party.openingBalance.toString(),
                imageUrl: party.imageUrl,
                isActive: party.isActive
              }}
            />
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
              <div className="text-muted-foreground">Customer sales</div>
              <div className="mt-1 font-semibold text-lg">{formatCurrency(summary.customerInvoiced)}</div>
            </div>
            <div className="rounded-xl border bg-background p-4 flex flex-col">
              <div className="text-muted-foreground">Customer paid / adjusted</div>
              <div className="mt-1 font-semibold text-lg">{formatCurrency(summary.customerPaid + summary.offsetApplied)}</div>
            </div>
            <div className="rounded-xl border bg-background p-4 flex flex-col">
              <div className="text-muted-foreground">Supplier supplies</div>
              <div className="mt-1 font-semibold text-lg">{formatCurrency(summary.supplierInvoiced)}</div>
            </div>
            <div className="rounded-xl border bg-background p-4 flex flex-col">
              <div className="text-muted-foreground">Supplier paid</div>
              <div className="mt-1 font-semibold text-lg">{formatCurrency(summary.supplierPaid)}</div>
            </div>
            <div className="rounded-xl border bg-background p-4 flex flex-col">
              <div className="text-muted-foreground">Offset applied</div>
              <div className="mt-1 font-semibold text-lg">{formatCurrency(summary.offsetApplied)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Supplier payable is deducted from customer due</div>
            </div>
            <div className="rounded-xl border bg-background p-4 flex flex-col">
              <div className="text-muted-foreground">{netBalanceLabel}</div>
              <div className="mt-1 font-semibold text-lg">{formatCurrency(summary.netSupplierDue > 0 && party.partyType !== 'CUSTOMER' ? summary.netSupplierDue : netBalanceAmount)}</div>
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
              {visibleEntryCount} entries
            </div>
          </div>
        </div>

        {showCustomerTable ? renderProductTable('Customer table: products taken from me', customerProductRows, 'No customer sale entries available yet.') : null}
        {showSupplierTable ? renderProductTable('Supplier table: products supplied to us', supplierProductRows, 'No supplier purchase entries available yet.') : null}
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
