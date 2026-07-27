import { MapPin, Package2, Phone, ReceiptText, Wallet2, Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { deletePaymentForParty, getPartyAccountSummary, recordPaymentForParty, updatePaymentForParty } from '@/features/parties/actions';
import { getCustomersForSales, getProductsForSales } from '@/features/sales/actions';
import { getProductsForPurchases } from '@/features/purchases/actions';
import PaymentFormDialog from './payment-form-dialog';
import { PartyPaymentsSection } from './party-payments-section';
import { PartyRowActions } from '../party-row-actions';
import { SalesEntryPopup } from '@/components/dashboard/sales-entry-popup';
import { SupplierProductsDialog } from '@/components/dashboard/supplier-products-dialog';
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
  notes: string | null;
  transactionItems: Array<{
    id: number;
    quantity: { toString(): string };
    unitPrice: { toString(): string };
    lineTotal: { toString(): string };
    description: string | null;
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

  const [transactions, payments, summary, customers, saleProducts, purchaseProducts] = await Promise.all([
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
        notes: true,
        transactionItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            description: true,
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
    getPartyAccountSummary(partyId),
    getCustomersForSales(),
    getProductsForSales(),
    getProductsForPurchases()
  ]);

  const customersForSales = customers.map((c) => ({ id: c.id, name: c.name }));
  const saleProductsForSales = saleProducts.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    productType: p.productType,
    unit: p.unit,
    defaultSellingPrice: Number(p.defaultSellingPrice ?? 0),
    stockQuantity: Number(p.stockBalance?.quantityOnHand ?? 0)
  }));
  const purchaseProductsForSupplier = purchaseProducts.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    productType: p.productType,
    unit: p.unit,
    defaultSellingPrice: Number(p.defaultSellingPrice ?? 0),
    stockQuantity: Number(p.stockBalance?.quantityOnHand ?? 0)
  }));

  const isCustomer = party.partyType === 'CUSTOMER' || party.partyType === 'BOTH';
  const isSupplier = party.partyType === 'SUPPLIER' || party.partyType === 'BOTH';
  const isBoth = party.partyType === 'BOTH';

  const productRows = transactions.flatMap((transaction) =>
    transaction.transactionItems.map((item) => ({
      id: `${transaction.id}-${item.id}`,
      invoiceNumber: transaction.invoiceNumber,
      transactionDate: transaction.transactionDate,
      transactionType: transaction.transactionType,
      mediaName: transaction.notes?.startsWith('Media:') ? transaction.notes.slice('Media:'.length).trim() : null,
      productName: item.product?.name ?? 'Unknown product',
      productType: item.product?.productType ?? '—',
      quantity: Number(item.quantity ?? 0),
      unit: item.product?.unit ?? '—',
      unitPrice: Number(item.unitPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
      details: item.description ?? null
    }))
  );
  const customerProductRows = productRows.filter((row) => row.transactionType === 'SALE');
  const supplierProductRows = productRows.filter((row) => row.transactionType === 'PURCHASE');
  const showCustomerTable = isCustomer;
  const showSupplierTable = isSupplier;
  const showPaySupplierButton = isSupplier;
  const showCustomerPaymentButton = isCustomer;
  const visibleEntryCount = (showCustomerTable ? customerProductRows.length : 0) + (showSupplierTable ? supplierProductRows.length : 0);

  const customerDue = summary.netCustomerDue;
  const supplierPayable = summary.netSupplierDue;
  const netBalanceAmount = isSupplier ? summary.supplierDue : summary.netCustomerDue;
  const netBalanceLabel = isSupplier
    ? 'Supplier payable'
    : summary.netSupplierDue > 0
      ? 'We owe supplier'
      : 'Customer due';
  const dueStatus = summary.netSupplierDue > 0 && !isCustomer
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
    emptyMessage: string,
    showMedia: boolean
  ) => (
    <div className="mt-6 overflow-hidden rounded-xl border min-w-0">
      <div className="bg-muted/40 px-4 py-3 text-sm font-semibold">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/10 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Quantity</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium">Unit price</th>
              <th className="px-4 py-3 font-medium">Line total</th>
              {showMedia ? <th className="px-4 py-3 font-medium">Media</th> : null}
              <th className="px-4 py-3 font-medium">Print</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">{formatDate(row.transactionDate)}</td>
                  <td className="px-4 py-3">{row.productName}</td>
                  <td className="px-4 py-3">{row.productType}</td>
                  <td className="px-4 py-3">{row.quantity}</td>
                  <td className="px-4 py-3">{row.unit}</td>
                  <td className="px-4 py-3">{formatCurrency(row.unitPrice)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.lineTotal)}</td>
                  {showMedia ? <td className="px-4 py-3">{row.mediaName ?? '—'}</td> : null}
                  <td className="px-4 py-3">
                    <a href={`/dashboard/sales/${row.id.split('-')[0]}`} className="text-sm text-blue-600 hover:underline">Print</a>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t">
                <td colSpan={showMedia ? 9 : 8} className="px-4 py-6 text-center text-muted-foreground">{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const partyTypeBadgeClass = party.partyType === 'CUSTOMER'
    ? 'bg-sky-100 text-sky-800'
    : party.partyType === 'SUPPLIER'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-purple-100 text-purple-800';

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <ToastRedirect initialSuccess={success ?? undefined} initialError={error ?? undefined} />
      <div className="min-w-0 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="min-w-0 space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {party.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={party.imageUrl} alt={party.name} className="h-24 w-24 rounded-full border object-cover shadow-md" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border bg-muted text-3xl font-semibold text-muted-foreground">
                  {party.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="mt-4 text-2xl font-semibold leading-tight">{party.name}</h1>
              <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${partyTypeBadgeClass}`}>
                {party.partyType === 'CUSTOMER' ? 'Customer' : party.partyType === 'SUPPLIER' ? 'Supplier' : 'Both'}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Mobile phone</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{party.phone ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Address</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{party.address ?? '—'}</p>
                </div>
              </div>
              {party.farmName ? (
                <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                  <Package2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Farm name</p>
                    <p className="mt-0.5 truncate text-sm font-semibold">{party.farmName}</p>
                  </div>
                </div>
              ) : null}
              <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                <ReceiptText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Opening balance</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{formatCurrency(Number(party.openingBalance ?? 0))}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
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
                printHref={`/dashboard/parties/${party.id}/print`}
                editButtonClassName="bg-blue-600 hover:bg-blue-700 text-white"
                printButtonClassName="bg-slate-600 hover:bg-slate-700 text-white"
              />
              {(party.partyType === 'CUSTOMER' || party.partyType === 'BOTH') && (
                <SalesEntryPopup
                  partyOptions={customersForSales}
                  productOptions={saleProductsForSales}
                  defaultPartyId={party.id}
                  defaultPartyName={party.name}
                  buttonClassName="bg-violet-600 hover:bg-violet-700 text-white"
                  buttonChildren="📊 Sales Entry"
                />
              )}
              {(party.partyType === 'SUPPLIER' || party.partyType === 'BOTH') && (
                <SupplierProductsDialog
                  partyId={party.id}
                  partyName={party.name}
                />
              )}
              {showPaySupplierButton ? (
                <PaymentFormDialog
                  partyId={party.id}
                  partyName={party.name}
                  title="Pay Supplier"
                  buttonLabel="Pay Supplier"
                  dueLabel="Current payable amount"
                  dueAmount={Number(summary.netSupplierDue ?? 0)}
                  toastSuccessMessage="Supplier payment recorded successfully"
                  recordPaymentForParty={recordPaymentForParty}
                  buttonClassName="bg-orange-600 hover:bg-orange-700 text-white"
                />
              ) : null}
              {showCustomerPaymentButton ? (
                <PaymentFormDialog
                  partyId={party.id}
                  partyName={party.name}
                  title="Customer Payment"
                  buttonLabel="Customer Payment"
                  dueLabel="Current receivable amount"
                  dueAmount={Number(summary.netCustomerDue ?? 0)}
                  toastSuccessMessage="Customer payment recorded successfully"
                  recordPaymentForParty={recordPaymentForParty}
                  buttonClassName="bg-emerald-600 hover:bg-emerald-700 text-white"
                />
              ) : null}
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Financial Overview</h2>
                <p className="mt-1 text-xs text-muted-foreground">Quick summary of the party account</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${dueBadgeClass}`}>{dueStatus}</span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {isCustomer ? (
                <>
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Customer sales</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.customerInvoiced)}</p>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Customer paid / adjusted</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.customerPaid + summary.offsetApplied)}</p>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Customer due</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrency(customerDue)}</p>
                  </div>
                </>
              ) : null}
              {isSupplier ? (
                <>
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Supplier supplies</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.supplierInvoiced)}</p>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Supplier paid</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.supplierPaid)}</p>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Supplier payable</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrency(supplierPayable)}</p>
                  </div>
                </>
              ) : null}
            </div>
          </section>

          {isBoth ? (
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Offset Summary</h2>
              <p className="mt-1 text-xs text-muted-foreground">Supplier payable is deducted from customer due</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-sm text-muted-foreground">Offset applied</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.offsetApplied)}</p>
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-sm text-muted-foreground">Net customer due</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.netCustomerDue)}</p>
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-sm text-muted-foreground">Net supplier payable</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.netSupplierDue)}</p>
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Transaction history</h2>
                <p className="mt-1 text-sm text-muted-foreground">Separate buy and sale history for this party.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2 text-sm font-medium">
                  <Wallet2 className="h-4 w-4" />
                  {visibleEntryCount} entries
                </div>
              </div>
            </div>

            {showCustomerTable ? renderProductTable('Sale History', customerProductRows, 'No sale history entries available yet.', true) : null}
            {showSupplierTable ? renderProductTable('Buy History', supplierProductRows, 'No buy history entries available yet.', false) : null}

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
                showDeleteButton={false}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
