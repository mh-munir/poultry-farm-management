import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { deletePaymentForParty, getPartyAccountSummary, recordPaymentForParty, updatePaymentForParty } from '@/features/parties/actions';
import { getCustomersForSales, getProductsForSales } from '@/features/sales/actions';
import { getProductsForPurchases } from '@/features/purchases/actions';
import PaymentFormDialog from './payment-form-dialog';
import { PartyRowActions } from '../party-row-actions';
import { SalesEntryPopup } from '@/components/dashboard/sales-entry-popup';
import { PartyProductsDialog } from '@/components/dashboard/party-products-dialog';
import { TransactionTabs } from './transaction-tabs';
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

type LedgerEntryRecord = {
  id: number;
  entryDate: Date;
  entryType: string;
  amount: { toString(): string };
  runningBalance: { toString(): string };
  description: string | null;
  referenceNumber: string | null;
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
      imageUrl: true,
      mediaName: true,
      farmName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  }) as PartyProfileRecord | null;

  if (!party) notFound();

  const [transactions, payments, ledgerEntries, summary, customers, saleProducts, purchaseProducts] = await Promise.all([
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
    prisma.ledgerEntry.findMany({
      where: { partyId },
      orderBy: { entryDate: 'desc' },
      select: {
        id: true,
        entryDate: true,
        entryType: true,
        amount: true,
        runningBalance: true,
        description: true,
        referenceNumber: true
      }
    }) as Promise<LedgerEntryRecord[]>,
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

  const totalBuy = summary.supplierInvoiced;
  const totalPaid = summary.supplierPaid;
  const totalPayable = summary.netSupplierDue;

  const isCustomer = party.partyType === 'CUSTOMER' || party.partyType === 'BOTH';
  const isSupplier = party.partyType === 'PARTY' || party.partyType === 'BOTH';
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
    ? 'Party supplier payable'
    : summary.netSupplierDue > 0
      ? 'We owe party supplier'
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

  const lastPurchaseDate = transactions
    .filter((t) => t.transactionType === 'PURCHASE')
    .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())[0];

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
    ['Party Supplier Supplies', formatCurrency(summary.supplierInvoiced)],
    ['Party Supplier Paid', formatCurrency(summary.supplierPaid)],
    ['Party Supplier Payable Before Offset', formatCurrency(summary.supplierDue)],
    ['Offset Applied', formatCurrency(summary.offsetApplied)],
    ['Net Customer Due', formatCurrency(summary.netCustomerDue)],
    ['Net Party Supplier Payable', formatCurrency(summary.netSupplierDue)],
    [],
    ['Payment History'],
    ['Date', 'Amount', 'Method', 'Reference', 'Status', 'Notes'],
    ...payments.map((payment) => [formatDate(payment.paymentDate), formatCurrency(payment.amount), payment.paymentMethod, payment.referenceNumber ?? '', payment.status, payment.notes ?? ''])
  ]
    .map((row) => row.join(','))
     .join('\n');

   const partyTypeBadgeClass = party.partyType === 'CUSTOMER'
    ? 'bg-sky-100 text-sky-800'
    : party.partyType === 'PARTY'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-purple-100 text-purple-800';

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-4 py-6">
      <ToastRedirect initialSuccess={success ?? undefined} initialError={error ?? undefined} />

      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard/parties" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back
            </a>
            <h1 className="text-page-title text-slate-950">{party.name}</h1>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-badge font-semibold ${partyTypeBadgeClass}`}>
              {party.partyType === 'CUSTOMER' ? 'Customer' : party.partyType === 'PARTY' ? 'Party Supplier' : 'Customer + Party Supplier'}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-badge font-semibold ${party.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {party.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/dashboard/parties/${party.id}/print`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14" rx="2"/></svg>
              Print
            </a>
            <a href={`/dashboard/parties/${party.id}/edit`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </a>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:grid-cols-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/><line x1="15" y1="7" x2="15" y2="7"/></svg>
          </div>
          <div>
            <p className="text-form-label text-muted-foreground">Mobile</p>
            <p className="text-sm font-semibold text-slate-900">{party.phone || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <p className="text-form-label text-muted-foreground">Address</p>
            <p className="text-sm font-semibold text-slate-900">{party.address || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <p className="text-form-label text-muted-foreground">Opening Balance</p>
            <p className="text-sm font-semibold text-slate-900">{formatCurrency(Number(party.openingBalance ?? 0))}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <p className="text-form-label text-muted-foreground">Party Type</p>
            <p className="text-sm font-semibold text-slate-900">{party.partyType === 'CUSTOMER' ? 'Customer' : party.partyType === 'PARTY' ? 'Party Supplier' : 'Both'}</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-card-title text-slate-950">Financial Summary</h2>
          <span className={`rounded-full px-3 py-1 text-badge font-medium ${dueBadgeClass}`}>{dueStatus}</span>
        </div>
        <p className="mb-4 text-card-subtitle">Account overview</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
              <div>
                <p className="text-form-label text-muted-foreground">Total Buy</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{formatCurrency(totalBuy)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div>
                <p className="text-form-label text-muted-foreground">Total Paid</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <p className="text-form-label text-muted-foreground">Outstanding Payable</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{formatCurrency(totalPayable)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <p className="text-form-label text-muted-foreground">Last Purchase</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{lastPurchaseDate ? formatDate(lastPurchaseDate.transactionDate) : '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isBoth ? (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-card-subtitle font-semibold uppercase tracking-wider text-slate-400">Offset Summary</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-form-label text-muted-foreground">Offset Applied</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{formatCurrency(summary.offsetApplied)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-form-label text-muted-foreground">Net Customer Due</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{formatCurrency(summary.netCustomerDue)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-form-label text-muted-foreground">Net Supplier Payable</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{formatCurrency(summary.netSupplierDue)}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-card-title text-slate-950">Transaction History</h2>
            <p className="text-card-subtitle">Buy, payments, and ledger records</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <button type="button" className="rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 bg-primary text-primary-foreground shadow-sm">Buy</button>
          <button type="button" className="rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 bg-muted text-muted-foreground hover:bg-muted/80">Payments</button>
          <button type="button" className="rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 bg-muted text-muted-foreground hover:bg-muted/80">Ledger</button>
        </div>
      </section>

      <TransactionTabs
        buyRows={supplierProductRows}
        payments={payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount.toString(),
          paymentDate: payment.paymentDate.toISOString(),
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          status: payment.status,
          notes: payment.notes
        }))}
        ledgerEntries={ledgerEntries.map((entry) => ({
          id: entry.id,
          entryDate: entry.entryDate,
          entryType: entry.entryType,
          amount: entry.amount.toString(),
          runningBalance: entry.runningBalance.toString(),
          description: entry.description,
          referenceNumber: entry.referenceNumber
        }))}
        partyId={party.id}
        recordPaymentForParty={recordPaymentForParty}
        updatePaymentForParty={updatePaymentForParty}
        deletePaymentForParty={deletePaymentForParty}
      />
    </main>
  );
}
