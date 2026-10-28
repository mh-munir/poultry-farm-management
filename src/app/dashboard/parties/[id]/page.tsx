import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  MapPin,
  Phone,
  Printer,
  ShoppingCart,
  TrendingUp,
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
import { allocateTransactionPayment } from '@/features/parties/item-payment-allocation';
import { Button } from '@/components/ui/button';
import PaymentFormDialog from './payment-form-dialog';
import { PartyRowActions } from '../party-row-actions';
import { SalesEntryPopup } from '@/components/dashboard/sales-entry-popup';
import { SupplierPurchaseButton } from '../supplier-purchase-button';
import { TransactionTabs } from './transaction-tabs';
import { SalesPurchaseSection } from './sales-purchase-section';
import ToastRedirect from '../toast-redirect';
import { formatLocalizedCurrency, formatLocalizedDate } from '@/lib/localized-formatters';
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

// using centralized Bangladesh-aware formatters

function getFormatters(locale: 'en' | 'bn') {
  return {
    formatCurrency: (value: number | string | { toString(): string } | null | undefined) =>
      formatLocalizedCurrency(value, locale),
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
  accent,
  valueClassName
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Wallet;
  accent: string;
  valueClassName?: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-form-label font-semibold text-muted-foreground">{title}</p>
          <p className={`mt-3 break-words text-2xl font-bold leading-tight tabular-nums ${valueClassName ?? 'text-foreground'}`}>{value}</p>
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
  const { formatCurrency, formatDate } = getFormatters(locale);
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

  const productRows = transactions.flatMap((transaction) => {
    const allocations = allocateTransactionPayment({
      lineTotals: transaction.transactionItems.map((item) => item.lineTotal.toString()),
      paidAmount: transaction.paidAmount.toString(),
      dueAmount: transaction.dueAmount.toString()
    });

    return transaction.transactionItems.map((item, index) => ({
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
      paid: allocations[index].paid,
      due: allocations[index].due,
      details: item.description ?? null,
      totalKg: Number(item.chickenQuantity ?? 0),
      productId: item.product?.id ?? 0
    }));
  });

  const customerProductRows = productRows.filter((row) => row.transactionType === 'SALE');
  const supplierProductRows = productRows.filter((row) => row.transactionType === 'PURCHASE');

  const openingBalanceLedger = ledgerEntries.find((entry) => entry.entryType === 'OPENING_BALANCE');
  const netCustomerDue = Number(summary.netCustomerDue);
  const netSupplierDue = Number(summary.netSupplierDue);
  const netBalance = netCustomerDue - netSupplierDue;
  const netBalanceTitle = netBalance > 0
    ? dict.common.customerDue
    : netBalance < 0
      ? dict.common.supplierDue
      : dict.common.netBalance;
  const dueStatus = netBalance === 0
    ? dict.common.clear
    : netBalance > 0
      ? dict.common.customerDue
      : dict.common.supplierDue;
  const dueBadgeClass = dueStatus === dict.common.clear
    ? 'bg-emerald-100 text-emerald-700'
    : dueStatus === dict.common.supplierDue
      ? 'bg-rose-100 text-rose-700'
      : 'bg-emerald-100 text-emerald-700';
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

      <section className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/50 p-4 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-gradient-to-b before:from-emerald-500 before:via-teal-500 before:to-sky-500 sm:p-6 lg:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-sky-100/40 blur-3xl" />
        <div className="relative flex flex-col gap-7">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-emerald-100 text-3xl font-bold text-emerald-600 shadow-[0_8px_24px_-16px_rgba(16,185,129,0.8)]">
              {party.imageUrl ? (
                <img src={party.imageUrl} alt={party.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(party.name)
              )}
                <span className={`absolute bottom-0.5 right-0.5 h-5 w-5 rounded-full border-4 border-white ${party.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-label={party.isActive ? dict.common.active : dict.common.inactive} />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <h2 className="min-w-0 break-words text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">{party.name}</h2>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold shadow-sm ${partyTypeBadgeClass}`}>
                  {formatPartyType(party.partyType, dict)}
                </span>
              </div>
              <div className="mt-5 grid min-w-0 gap-3 text-sm text-slate-500 sm:grid-cols-2 sm:gap-x-6">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span className="truncate font-medium text-slate-800">{party.phone || '-'}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate">{party.address || '-'}</span>
                </div>
              </div>
            </div>
          </div>

            <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 lg:justify-end">
              <span className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold shadow-sm ${dueBadgeClass}`}>
                <CheckCircle2 className="h-4 w-4" />
                {dueStatus}
              </span>
              <span className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold shadow-sm ${party.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {party.isActive ? dict.common.active : dict.common.inactive}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-6 xl:flex-row xl:items-center xl:justify-start">
            <div className="flex flex-wrap items-center justify-start gap-3 xl:flex-none">
              {isCustomer ? (
                <SalesEntryPopup
                  partyOptions={customersForSales}
                  productOptions={saleProductsForSales}
                  defaultPartyId={party.id}
                  defaultPartyName={party.name}
                  buttonClassName="h-14 w-full min-w-[190px] justify-between rounded-xl bg-emerald-600 px-4 text-sm text-white shadow-[0_10px_20px_-14px_rgba(16,185,129,0.9)] hover:bg-emerald-700 sm:w-auto"
                  buttonChildren={(
                    <>
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                          <ShoppingCart className="h-4 w-4" />
                        </span>
                        {dict.common.salesEntry}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                />
              ) : null}
              {isSupplier ? (
                <SupplierPurchaseButton
                  defaultPartyId={party.id}
                  defaultPartyName={party.name}
                  buttonClassName="h-14 w-full min-w-[190px] justify-between rounded-xl bg-emerald-600 px-4 text-sm text-white shadow-[0_10px_20px_-14px_rgba(16,185,129,0.9)] hover:bg-emerald-700 sm:w-auto"
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
                  toastSuccessMessage={dict.common.customerPaymentRecordedSuccessfully}
                  recordPaymentForParty={receiveCustomerPayment}
                  buttonClassName="h-14 w-full min-w-[190px] justify-between rounded-xl bg-blue-600 px-4 text-sm text-white shadow-[0_10px_20px_-14px_rgba(37,99,235,0.9)] hover:bg-blue-700 sm:w-auto"
                  buttonLeading={(
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                      <Wallet className="h-4 w-4" />
                    </span>
                  )}
                  buttonTrailing={<ArrowRight className="h-4 w-4" />}
                />
              ) : null}
              {isSupplier ? (
                <PaymentFormDialog
                  partyId={party.id}
                  partyName={party.name}
                  title={dict.common.paySupplier}
                  buttonLabel={dict.common.paySupplier}
                  dueLabel={dict.common.supplierDue}
                  dueAmount={Number(summary.netSupplierDue)}
                  toastSuccessMessage={dict.common.supplierPaymentRecordedSuccessfully}
                  recordPaymentForParty={paySupplierPayment}
                  buttonClassName="h-14 w-full min-w-[190px] justify-between rounded-xl bg-orange-500 px-4 text-sm text-white shadow-[0_10px_20px_-14px_rgba(249,115,22,0.9)] hover:bg-orange-600 sm:w-auto"
                  buttonLeading={(
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                      <Wallet className="h-4 w-4" />
                    </span>
                  )}
                  buttonTrailing={<ArrowRight className="h-4 w-4" />}
                />
              ) : null}
            </div>
            <div className="hidden h-16 w-px bg-slate-200 xl:block" />
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row xl:w-auto">
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
                editButtonClassName="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto"
              />
              <Button asChild variant="outline" className="h-14 w-full rounded-xl border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto">
                <a href={`/dashboard/parties/${party.id}/print`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 whitespace-nowrap">
                  <Printer className="h-4 w-4" />
                  {dict.common.printReceipt}
                </a>
              </Button>
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
          title={party.openingBalanceType === 'CUSTOMER_ADVANCE' ? dict.common.profileOpeningAdvance : dict.common.profileOpeningDue}
          value={formatCurrency(summary.originalOpeningAmount)}
          description={dict.common.openingAmountIncludedInNetBalance}
          icon={Wallet}
          accent="bg-violet-50 text-violet-600"
        />
        <KpiCard title={dict.common.totalFeedMedicineSales} value={formatCurrency(summary.customerSales)} description={dict.common.soldToThisParty} icon={TrendingUp} accent="bg-sky-50 text-sky-600" />
        <KpiCard title={dict.common.totalPaidByCustomer} value={formatCurrency(summary.customerPayments)} description={dict.common.receivedFromThisParty} icon={CircleDollarSign} accent="bg-emerald-50 text-emerald-600" />
        <KpiCard title={dict.common.totalEggChickenPurchases} value={formatCurrency(summary.supplierPurchases)} description={dict.common.boughtFromThisParty} icon={ShoppingCart} accent="bg-sky-50 text-sky-600" />
        <KpiCard title={dict.common.totalPaidToSupplier} value={formatCurrency(summary.supplierPayments)} description={dict.common.paidToThisParty} icon={BadgeDollarSign} accent="bg-amber-50 text-amber-600" />
        <KpiCard
          title={netBalanceTitle}
          value={formatCurrency(Math.abs(netBalance))}
          description={netBalance === 0 ? dict.common.allAccountsSettled : dict.common.finalBalanceAfterAllTransactions}
          icon={netBalance < 0 ? Wallet : CreditCard}
          accent={netBalance < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}
          valueClassName={netBalance < 0 ? 'text-rose-700' : 'text-emerald-700'}
        />
      </section>

      <section className="mt-5 rounded-3xl border border-border bg-card shadow-sm hidden">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-4 p-6 text-base font-semibold text-foreground transition hover:bg-slate-50">
            <div>
              <p className="text-lg font-semibold">{dict.common.openingBalanceInformation}</p>
              <p className="mt-1 text-sm text-muted-foreground">{dict.common.initialCustomerBalanceSnapshot}</p>
            </div>
            <span className="rounded-full border border-border bg-slate-100 px-3 py-1 text-sm text-muted-foreground transition group-open:bg-slate-200">
              {dict.common.showDetails}
            </span>
          </summary>
          <div className="border-t border-border px-6 pb-6 pt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryMiniCard label={dict.common.openingBalanceAmount} value={formatCurrency(openingBalanceLedger?.amount ?? party.openingBalance)} />
              <SummaryMiniCard label={dict.common.balanceType} value={party.openingBalanceType === 'CUSTOMER_ADVANCE' ? dict.common.profileOpeningAdvance : dict.common.customerDue} />
              <SummaryMiniCard label={dict.common.createdDate} value={formatDate(openingBalanceLedger?.entryDate ?? party.createdAt)} />
              <SummaryMiniCard label={dict.common.partyDescription} value={openingBalanceLedger?.description ?? party.openingBalanceDescription ?? '—'} />
            </div>
          </div>
        </details>
      </section>

      <SalesPurchaseSection
        partyId={party.id}
        saleRows={customerProductRows}
        buyRows={supplierProductRows}
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
          recordPaymentForParty={recordPaymentForParty}
          updatePaymentForParty={updatePaymentForParty}
          deletePaymentForParty={deletePaymentForParty}
        />
      </section>

      <p className="mt-6 text-sm text-muted-foreground">{dict.common.allAmountsIn}</p>
    </main>
  );
}
