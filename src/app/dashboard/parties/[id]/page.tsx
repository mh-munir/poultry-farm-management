import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  MapPin,
  Phone,
  Printer,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  UserRound,
  Wallet
} from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import {
  deletePaymentForParty,
  getPartyAccountSummary,
  paySupplierPayment,
  receiveCustomerPayment,
  recordPaymentForParty,
  updatePaymentForParty
} from '@/features/parties/actions';
import { getCustomersForSales, getProductsForSales } from '@/features/sales/actions';
import { Button } from '@/components/ui/button';
import PaymentFormDialog from './payment-form-dialog';
import { PartyRowActions } from '../party-row-actions';
import { SalesEntryPopup } from '@/components/dashboard/sales-entry-popup';
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
  return `Tk ${new Intl.NumberFormat('en-US', {
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

function formatPartyType(value: string) {
  if (value === 'CUSTOMER') return 'Customer';
  if (value === 'PARTY') return 'Supplier';
  return 'Both';
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase()).join('') || 'P';
}

function SummaryMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-form-label text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  accent
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Wallet;
  accent: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-form-label font-semibold text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-bold leading-none text-foreground tabular-nums">{value}</p>
          <p className="mt-2 text-card-subtitle">{description}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </section>
  );
}

export default async function PartyProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
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

  const [transactions, payments, ledgerEntries, summary, customers, saleProducts] = await Promise.all([
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
    getProductsForSales()
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
  const isCustomer = party.partyType === 'CUSTOMER' || party.partyType === 'BOTH';
  const isSupplier = party.partyType === 'PARTY' || party.partyType === 'BOTH';

  const productRows = transactions.flatMap((transaction) =>
    transaction.transactionItems.map((item) => ({
      id: `${transaction.id}-${item.id}`,
      transactionId: transaction.id,
      invoiceNumber: transaction.invoiceNumber,
      transactionDate: transaction.transactionDate,
      transactionType: transaction.transactionType,
      mediaName: transaction.notes?.startsWith('Media:') ? transaction.notes.slice('Media:'.length).trim() : null,
      productName: item.product?.name ?? 'Unknown product',
      productType: item.product?.productType ?? '-',
      quantity: Number(item.quantity ?? 0),
      unit: item.product?.unit ?? '-',
      unitPrice: Number(item.unitPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
      details: item.description ?? null
    }))
  );

  const customerProductRows = productRows.filter((row) => row.transactionType === 'SALE');
  const supplierProductRows = productRows.filter((row) => row.transactionType === 'PURCHASE');

  const latestLedger = ledgerEntries[0];
  const latestTransactionDate = latestLedger?.entryDate ?? transactions[0]?.transactionDate ?? payments[0]?.paymentDate ?? null;
  const dueStatus = summary.netCustomerDue <= 0 && summary.netSupplierDue <= 0
    ? 'Cleared'
    : summary.netCustomerDue > 0 && summary.netSupplierDue > 0
      ? 'Open'
      : summary.netCustomerDue > 0
        ? 'Customer Due'
        : 'Supplier Payable';
  const dueBadgeClass = dueStatus === 'Cleared'
    ? 'bg-emerald-100 text-emerald-700'
    : dueStatus === 'Supplier Payable'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-rose-100 text-rose-700';
  const partyTypeBadgeClass = party.partyType === 'CUSTOMER'
    ? 'bg-sky-100 text-sky-800'
    : party.partyType === 'PARTY'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-violet-100 text-violet-800';

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-3 py-5 sm:px-5 lg:px-6">
      <ToastRedirect initialSuccess={success ?? undefined} initialError={error ?? undefined} />

      <div className="mb-5">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/dashboard/parties">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-primary/10 text-3xl font-bold text-primary shadow-sm">
              {party.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={party.imageUrl} alt={party.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(party.name)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">{party.name}</h1>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-badge font-semibold ${partyTypeBadgeClass}`}>
                  {formatPartyType(party.partyType)}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate font-medium text-foreground">{party.phone || '-'}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{party.address || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:items-end">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <span className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-badge font-semibold ${dueBadgeClass}`}>
                <CheckCircle2 className="h-4 w-4" />
                {dueStatus}
              </span>
              <span className={`inline-flex h-9 items-center rounded-full px-3 text-badge font-semibold ${party.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {party.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <PartyRowActions
                editOnly
                party={{
                  id: party.id,
                  name: party.name,
                  phone: party.phone,
                  email: party.email,
                  address: party.address,
                  partyType: party.partyType,
                  taxNumber: party.taxNumber,
                  creditLimit: party.creditLimit?.toString() ?? null,
                  openingBalance: party.openingBalance.toString(),
                  imageUrl: party.imageUrl,
                  isActive: party.isActive
                }}
                editButtonClassName="h-[42px] bg-secondary text-secondary-foreground hover:bg-secondary/80"
              />
              {isCustomer ? (
                <SalesEntryPopup
                  partyOptions={customersForSales}
                  productOptions={saleProductsForSales}
                  defaultPartyId={party.id}
                  defaultPartyName={party.name}
                  buttonClassName="h-[42px] bg-primary text-primary-foreground hover:bg-primary/90"
                  buttonChildren={(
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Sales Entry
                    </>
                  )}
                />
              ) : null}
              {isCustomer ? (
                <PaymentFormDialog
                  partyId={party.id}
                  partyName={party.name}
                  title="Customer Payment"
                  buttonLabel="Customer Payment"
                  dueLabel="Customer Due"
                  dueAmount={summary.netCustomerDue}
                  toastSuccessMessage="Customer payment recorded successfully."
                  recordPaymentForParty={receiveCustomerPayment}
                  buttonClassName="h-[42px] bg-emerald-600 text-white hover:bg-emerald-700"
                />
              ) : null}
              {isSupplier ? (
                <PaymentFormDialog
                  partyId={party.id}
                  partyName={party.name}
                  title="Pay Supplier"
                  buttonLabel="Pay Supplier"
                  dueLabel="Supplier Payable"
                  dueAmount={summary.netSupplierDue}
                  toastSuccessMessage="Supplier payment recorded successfully."
                  recordPaymentForParty={paySupplierPayment}
                  buttonClassName="h-[42px] bg-amber-500 text-white hover:bg-amber-600"
                />
              ) : null}
              <Button asChild variant="outline" className="h-[42px]">
                <a href={`/dashboard/parties/${party.id}/print`} target="_blank" rel="noreferrer">
                  <Printer className="h-4 w-4" />
                  Print
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Customer Due"
          value={formatCurrency(summary.netCustomerDue)}
          description="Receivable after supplier offset"
          icon={CreditCard}
          accent="bg-rose-50 text-rose-600"
        />
        <KpiCard
          title="Supplier Payable"
          value={formatCurrency(summary.netSupplierDue)}
          description="Payable after customer offset"
          icon={Wallet}
          accent="bg-amber-50 text-amber-600"
        />
        <KpiCard
          title="Total Sales"
          value={formatCurrency(summary.customerInvoiced)}
          description="Gross customer invoiced value"
          icon={TrendingUp}
          accent="bg-sky-50 text-sky-600"
        />
        <KpiCard
          title="Total Purchase"
          value={formatCurrency(summary.supplierInvoiced)}
          description="Gross supplier purchase value"
          icon={ReceiptText}
          accent="bg-emerald-50 text-emerald-600"
        />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-card-title">Customer Account</h2>
              <p className="text-card-subtitle">Sales and receivable position</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryMiniCard label="Total Sales" value={formatCurrency(summary.customerInvoiced)} />
            <SummaryMiniCard label="Received" value={formatCurrency(summary.customerPaid)} />
            <SummaryMiniCard label="Customer Due" value={formatCurrency(summary.customerDue)} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-card-title">Supplier Account</h2>
              <p className="text-card-subtitle">Purchases and payable position</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryMiniCard label="Total Purchase" value={formatCurrency(summary.supplierInvoiced)} />
            <SummaryMiniCard label="Paid" value={formatCurrency(summary.supplierPaid)} />
            <SummaryMiniCard label="Supplier Payable" value={formatCurrency(summary.supplierDue)} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-card-title">Settlement Summary</h2>
              <p className="text-card-subtitle">Offset and net account position</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryMiniCard label="Offset Applied" value={formatCurrency(summary.offsetApplied)} />
            <SummaryMiniCard label="Net Customer Due" value={formatCurrency(summary.netCustomerDue)} />
            <SummaryMiniCard label="Net Supplier Payable" value={formatCurrency(summary.netSupplierDue)} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-card-title">Quick Information</h2>
              <p className="text-card-subtitle">Profile and activity details</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryMiniCard label="Opening Balance" value={formatCurrency(party.openingBalance)} />
            <SummaryMiniCard label="Party Since" value={formatDate(party.createdAt)} />
            <SummaryMiniCard label="Last Transaction" value={latestTransactionDate ? formatDate(latestTransactionDate) : '-'} />
            <SummaryMiniCard label="Total Transactions" value={String(transactions.length)} />
          </div>
        </div>
      </section>

      <section className="mt-5">
        <TransactionTabs
          saleRows={customerProductRows}
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
          printHref={`/dashboard/parties/${party.id}/print`}
          recordPaymentForParty={recordPaymentForParty}
          updatePaymentForParty={updatePaymentForParty}
          deletePaymentForParty={deletePaymentForParty}
        />
      </section>
    </main>
  );
}
