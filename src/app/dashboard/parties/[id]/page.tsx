import Link from 'next/link';
import { cookies } from 'next/headers';
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

type SerializableDecimal = number | string | { toString(): string } | null;
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
import { SalesPurchaseSection } from './sales-purchase-section';
import ToastRedirect from '../toast-redirect';
import { formatLocalizedCurrency, formatLocalizedNumber, formatLocalizedDate } from '@/lib/localized-formatters';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { getDictionary } from '@/i18n';

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
  openingBalanceType: string | null;
  openingBalanceDescription: string | null;
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
  mediaName: string | null;
  transactionItems: Array<{
    id: number;
    quantity: { toString(): string };
    unitPrice: { toString(): string };
    lineTotal: { toString(): string };
    description: string | null;
    chickenQuantity: { toString(): string } | null;
    product: {
      id: number;
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

type SalesCustomerOption = { id: number; name: string };
type SalesProductOption = {
  id: number;
  name: string;
  code: string;
  productType: string;
  unit: string;
  defaultSellingPrice: SerializableDecimal;
  defaultPurchasePrice: SerializableDecimal;
  stockBalance?: { quantityOnHand: SerializableDecimal } | null;
  stockMovements?: Array<{ unitCost: SerializableDecimal } | null> | null;
};

function formatCurrency(value: number | string | { toString(): string } | null | undefined) {
  const number = Number(value?.toString() ?? 0);
  return `Tk ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)}`;
}

// using centralized Bangladesh-aware formatters

function getFormatters(locale: 'en' | 'bn') {
  return {
    formatCurrency: (value: number | string | { toString(): string } | null | undefined) =>
      formatLocalizedCurrency(value, locale),
    formatNumber: (value: number | string | null | undefined) =>
      formatLocalizedNumber(value, locale),
    formatDate: (value: Date | string | null | undefined) =>
      formatLocalizedDate(value, locale),
  };
}

function formatPartyType(value: string, dict: ReturnType<typeof getDictionary>) {
  if (value === 'CUSTOMER') return dict.common.customer;
  if (value === 'PARTY') return dict.common.supplier;
  return dict.common.both;
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
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-form-label font-semibold text-muted-foreground">{title}</p>
          <p className="mt-3 break-words text-2xl font-bold leading-tight text-foreground tabular-nums">{value}</p>
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
  const locale = getLocaleFromValue((await cookies()).get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);
  const { formatCurrency, formatNumber, formatDate } = getFormatters(locale);
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
      openingBalanceType: true,
      openingBalanceDescription: true,
      imageUrl: true,
      mediaName: true,
      farmName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  }) as PartyProfileRecord | null;

  if (!party) notFound();

  const result: Promise<[
    PartyTransactionRecord[],
    PartyPaymentRecord[],
    LedgerEntryRecord[],
    Awaited<ReturnType<typeof getPartyAccountSummary>>,
    SalesCustomerOption[],
    SalesProductOption[]
  ]> = Promise.all([
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
        mediaName: true,
        transactionItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            description: true,
            chickenQuantity: true,
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                productType: true
              }
            }
          }
        }
      }
    }),
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
    }),
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
    }),
    getPartyAccountSummary(partyId),
    getCustomersForSales(),
    getProductsForSales()
  ]);

  const [rawTransactions, payments, ledgerEntries, summary, customers, saleProducts] = await result as [
    PartyTransactionRecord[],
    PartyPaymentRecord[],
    LedgerEntryRecord[],
    Awaited<ReturnType<typeof getPartyAccountSummary>>,
    SalesCustomerOption[],
    SalesProductOption[]
  ];
  const transactions = rawTransactions;

  const customersForSales = customers.map((c) => ({ id: c.id, name: c.name }));
  const saleProductsForSales = saleProducts.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    productType: p.productType,
    unit: p.unit,
    defaultSellingPrice: Number(p.defaultSellingPrice ?? 0),
    defaultPurchasePrice: Number(p.stockMovements?.[0]?.unitCost ?? p.defaultPurchasePrice ?? 0),
    stockQuantity: Number(p.stockBalance?.quantityOnHand ?? 0)
  }));
  const isCustomer = party.partyType === 'CUSTOMER' || party.partyType === 'BOTH';
  const isSupplier = party.partyType === 'PARTY' || party.partyType === 'BOTH';

  const productRows = transactions.flatMap((transaction) =>
    transaction.transactionItems.map((item) => ({
      id: `${transaction.id}-${item.id}`,
      itemId: item.id,
      transactionId: transaction.id,
      invoiceNumber: transaction.invoiceNumber,
      transactionDate: transaction.transactionDate,
      transactionType: transaction.transactionType,
      mediaName: transaction.mediaName || null,
      productName: item.product?.name ?? dict.common.unknownProduct,
      productType: item.product?.productType ?? '-',
      quantity: Number(item.quantity ?? 0),
      unit: item.product?.unit ?? '-',
      unitPrice: Number(item.unitPrice ?? 0),
      discount: 0,
      lineTotal: Number(item.lineTotal ?? 0),
      details: item.description ?? null,
      totalKg: Number(item.chickenQuantity ?? 0),
      productId: item.product?.id ?? 0
    }))
  );

  const customerProductRows = productRows.filter((row) => row.transactionType === 'SALE');
  const supplierProductRows = productRows.filter((row) => row.transactionType === 'PURCHASE');

  const openingBalanceLedger = ledgerEntries.find((entry) => entry.entryType === 'OPENING_BALANCE');
  const latestLedger = ledgerEntries[0];
  const latestTransactionDate = latestLedger?.entryDate ?? transactions[0]?.transactionDate ?? payments[0]?.paymentDate ?? null;
  const currentBalance = Number(summary.currentBalance ?? party.openingBalance ?? 0);
  const netCustomerDue = Number(summary.netCustomerDue);
  const netSupplierDue = Number(summary.netSupplierDue);
  const dueStatus = netCustomerDue <= 0 && netSupplierDue <= 0
    ? dict.common.clear
    : netCustomerDue > 0 && netSupplierDue > 0
      ? dict.common.open
      : netCustomerDue > 0
        ? dict.common.customerDue
        : dict.common.supplierPayable;
  const dueBadgeClass = dueStatus === dict.common.clear
    ? 'bg-emerald-100 text-emerald-700'
    : dueStatus === dict.common.supplierPayable
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

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">{dict.common.partiesProfileBreadcrumb}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{dict.common.partyProfileTitle}</h1>
        </div>
        <Button asChild variant="outline" size="sm" className="text-muted-foreground">
          <Link href="/dashboard/parties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {dict.common.backToParties}
          </Link>
        </Button>
      </div>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr] xl:items-center">
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border bg-primary/10 text-3xl font-bold text-primary shadow-sm">
              {party.imageUrl ? (
                <img src={party.imageUrl} alt={party.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(party.name)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{party.name}</h2>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${partyTypeBadgeClass}`}>
                  {formatPartyType(party.partyType, dict)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
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
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold ${dueBadgeClass}`}>
                <CheckCircle2 className="h-4 w-4" />
                {dueStatus}
              </span>
              <span className={`inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold ${party.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {party.isActive ? dict.common.active : dict.common.inactive}
              </span>
            </div>
            <div className="flex min-w-0 flex-col flex-wrap items-stretch justify-end gap-2 md:flex-row md:items-center">
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
                  openingBalanceType: party.openingBalanceType,
                  openingBalanceDescription: party.openingBalanceDescription,
                  imageUrl: party.imageUrl,
                  isActive: party.isActive
                }}
                editButtonClassName="h-[42px] bg-secondary text-secondary-foreground hover:bg-secondary/80"
              />
              <div className="flex min-w-0 flex-col flex-wrap items-stretch gap-2 md:flex-row md:items-center md:justify-end">
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
                        {dict.common.salesEntry}
                      </>
                    )}
                  />
                ) : null}
                {isCustomer ? (
                  <PaymentFormDialog
                    partyId={party.id}
                    partyName={party.name}
                    title={dict.common.customerPayment}
                    buttonLabel={dict.common.customerPayment}
                    dueLabel={dict.common.customerDue}
                    dueAmount={Number(summary.netCustomerDue)}
                    toastSuccessMessage={dict.common.customerPayment + ' recorded successfully.'}
                    recordPaymentForParty={receiveCustomerPayment}
                    buttonClassName="h-[42px] bg-emerald-600 text-white hover:bg-emerald-700"
                  />
                ) : null}
                {isSupplier ? (
                  <PaymentFormDialog
                    partyId={party.id}
                    partyName={party.name}
                    title={dict.common.paySupplier}
                    buttonLabel={dict.common.paySupplier}
                    dueLabel={dict.common.supplierPayable}
                    dueAmount={Number(summary.netSupplierDue)}
                    toastSuccessMessage={dict.common.paySupplier + ' recorded successfully.'}
                    recordPaymentForParty={paySupplierPayment}
                    buttonClassName="h-[42px] bg-amber-500 text-white hover:bg-amber-600"
                  />
                ) : null}
                <Button asChild variant="outline" className="h-[42px]">
                  <a href={`/dashboard/parties/${party.id}/print`} target="_blank" rel="noreferrer" className="flex items-center gap-2 whitespace-nowrap">
                    <Printer className="h-4 w-4" />
                    {dict.common.printReceipt}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 hidden">
        <KpiCard
          title={dict.common.customerDue}
          value={formatCurrency(summary.netCustomerDue)}
          description={dict.common.salesAndReceivables}
          icon={CreditCard}
          accent="bg-rose-50 text-rose-600"
        />
        <KpiCard
          title={dict.common.sales}
          value={formatCurrency(summary.customerInvoiced)}
          description={dict.common.customerDue}
          icon={TrendingUp}
          accent="bg-sky-50 text-sky-600"
        />
        <KpiCard
          title={dict.common.paid}
          value={formatCurrency(summary.customerPaid)}
          description={dict.common.customerPayment}
          icon={CircleDollarSign}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          title={dict.common.supplierPayable}
          value={formatCurrency(summary.netSupplierDue)}
          description={dict.common.purchasesAndPayables}
          icon={Wallet}
          accent="bg-amber-50 text-amber-600"
        />
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title={party.openingBalanceType === 'CUSTOMER_ADVANCE' ? 'Party Credit Balance (Advance)' : 'Party Owes You Money (Due)'}
          value={formatCurrency(party.openingBalanceType === 'CUSTOMER_ADVANCE' ? summary.remainingOpeningAdvance : summary.remainingOpeningDue)}
          description={party.openingBalanceType === 'CUSTOMER_ADVANCE'
            ? `Opening: ${formatCurrency(summary.originalOpeningAdvance)} · Used: ${formatCurrency(summary.usedOpeningAdvance)}`
            : `Opening: ${formatCurrency(summary.originalOpeningAmount)} · Received: ${formatCurrency(summary.customerPayments)}`}
          icon={Wallet}
          accent="bg-violet-50 text-violet-600"
        />
        <KpiCard title="Customer Due" value={formatCurrency(summary.customerDue)} description="Party → You" icon={CreditCard} accent="bg-rose-50 text-rose-600" />
        <KpiCard title="Paid by Party" value={formatCurrency(summary.customerPayments)} description="Party → You" icon={CircleDollarSign} accent="bg-emerald-50 text-emerald-600" />
        <KpiCard title="Total Purchase" value={formatCurrency(summary.supplierPurchases)} description="You ← Party" icon={ShoppingCart} accent="bg-sky-50 text-sky-600" />
        <KpiCard title="Total Paid" value={formatCurrency(summary.supplierPayments)} description="You → Party" icon={BadgeDollarSign} accent="bg-amber-50 text-amber-600" />
        <KpiCard
          title="Supplier Payable"
          value={formatCurrency(summary.supplierPayable)}
          description={`You owe this party · Advance: ${formatCurrency(summary.supplierAdvance)}`}
          icon={Wallet}
          accent="bg-amber-50 text-amber-600"
        />
      </section>

      <section className="mt-5 rounded-3xl border border-border bg-card shadow-sm hidden">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-4 p-6 text-base font-semibold text-foreground transition hover:bg-slate-50">
            <div>
              <p className="text-lg font-semibold">Opening Balance Information</p>
              <p className="mt-1 text-sm text-muted-foreground">Initial customer balance snapshot</p>
            </div>
            <span className="rounded-full border border-border bg-slate-100 px-3 py-1 text-sm text-muted-foreground transition group-open:bg-slate-200">
              Show Details
            </span>
          </summary>
          <div className="border-t border-border px-6 pb-6 pt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryMiniCard label="Opening Balance Amount" value={formatCurrency(openingBalanceLedger?.amount ?? party.openingBalance)} />
              <SummaryMiniCard label="Balance Type" value={party.openingBalanceType === 'CUSTOMER_ADVANCE' ? 'Customer Advance' : 'Customer Due'} />
              <SummaryMiniCard label="Created Date" value={formatDate(openingBalanceLedger?.entryDate ?? party.createdAt)} />
              <SummaryMiniCard label="Description" value={openingBalanceLedger?.description ?? party.openingBalanceDescription ?? '—'} />
            </div>
          </div>
        </details>
      </section>

      <SalesPurchaseSection
        saleRows={customerProductRows}
        buyRows={supplierProductRows}
        partyId={party.id}
      />

      <section className="mt-5">
        <TransactionTabs
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

      <p className="mt-6 text-sm text-muted-foreground">{dict.common.allAmountsIn}</p>
    </main>
  );
}
