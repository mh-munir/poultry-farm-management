import Link from 'next/link';
import { ArrowLeft, CalendarDays, CheckCircle2, CircleDollarSign, Factory, FileText, Mail, MapPin, Phone, Printer, ReceiptText, UserRound, Wallet } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { DEFAULT_PAGE_SIZE } from '@/config/pagination';
import { formatDateBD as formatDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { prisma } from '@/server/db';
import { getCompanyAccountSummary, getCompanyProfile } from '@/features/companies/actions';
import { serializeCompany } from '@/features/companies/serializer';
import { CompanyRowActions } from '@/app/dashboard/parties/company-row-actions';
import { CompanyProfileActions } from './company-profile-actions';
import { CompanyProfilePayButton } from './company-profile-pay-button';
import { CompanyProfileFilter } from './company-profile-filter';
import ToastRedirect from '../toast-redirect';
import { AddStockModal } from '@/components/dashboard/stock/add-stock-modal';
import { StockManagement } from '@/components/dashboard/stock/stock-management';
import { getStockItemsByType } from '@/features/stock/actions';
import { getCompaniesByType } from '@/features/companies/actions';

type CompanyProfileRecord = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  companyType: string;
  isActive: boolean;
  openingBalance: string;
  openingBalanceDescription: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  _count: {
    transactions: number;
    products: number;
  };
};

type CompanyTransactionRecord = {
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

type CompanyPaymentRecord = {
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

// using centralized Bangladesh-aware formatter (formatDate alias is imported)

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

export default async function CompanyProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ success?: string; error?: string; historyPage?: string; purchaseTypeFilter?: string }> }) {
  await requireUser();
  const { id } = await params;
  const companyId = Number(id);
  const sp = await searchParams;
  const success = sp?.success ?? '';
  const error = sp?.error ?? '';
  const historyPage = Number(sp?.historyPage ?? '1');
  const purchaseTypeFilter = sp?.purchaseTypeFilter ?? 'ALL';

  const rawCompany = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      address: true,
      companyType: true,
      isActive: true,
      openingBalance: true,
      openingBalanceDescription: true,
      createdAt: true,
      updatedAt: true,
      createdById: true
    }
  });

  if (!rawCompany) notFound();

  const company = serializeCompany(rawCompany);

  const [transactions, payments, summary, feedItems, medicineItems, chickItems, feedCompanies, medicineCompanies, chickCompanies] = await Promise.all([
    prisma.transaction.findMany({
      where: { companyId },
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
    }) as Promise<CompanyTransactionRecord[]>,
    prisma.payment.findMany({
      where: { companyId },
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
    }) as Promise<CompanyPaymentRecord[]>,
    getCompanyAccountSummary(companyId),
    getStockItemsByType('FEED', companyId),
    getStockItemsByType('MEDICINE', companyId),
    getStockItemsByType('CHICK', companyId),
    getCompaniesByType('FEED'),
    getCompaniesByType('MEDICINE'),
    getCompaniesByType('CHICK')
  ]);

  const sortedTransactions = [...transactions].sort((a, b) =>
    new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime() || a.id - b.id
  );
  const sortedPayments = [...payments].sort((a, b) =>
    new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime() || a.id - b.id
  );

  const mergedAsc: Array<{ kind: 'transaction' | 'payment'; date: Date; data: any }> = [];
  let ti = 0;
  let pi = 0;
  while (ti < sortedTransactions.length || pi < sortedPayments.length) {
    const t = sortedTransactions[ti];
    const p = sortedPayments[pi];
    if (!p || (t && new Date(t.transactionDate).getTime() <= new Date(p.paymentDate).getTime())) {
      mergedAsc.push({ kind: 'transaction', date: new Date(t.transactionDate), data: t });
      ti++;
    } else {
      mergedAsc.push({ kind: 'payment', date: new Date(p.paymentDate), data: p });
      pi++;
    }
  }

  let runningBalance = 0;
  const historyRows: any[] = [];
  for (const record of mergedAsc) {
    if (record.kind === 'transaction') {
      runningBalance += Number(record.data.totalAmount);
      for (const item of record.data.transactionItems) {
        historyRows.push({
          id: `${record.data.id}-${item.id}`,
          date: record.date,
          invoiceNumber: record.data.invoiceNumber,
          type: record.data.transactionType,
          productName: item.product?.name ?? 'Unknown product',
          productType: item.product?.productType ?? null,
          quantity: Number(item.quantity ?? 0),
          unit: item.product?.unit ?? '—',
          unitPrice: Number(item.unitPrice ?? 0),
          lineTotal: Number(item.lineTotal ?? 0),
          runningBalance,
          isPayment: false
        });
      }
    } else {
      runningBalance -= Number(record.data.amount);
      historyRows.push({
        id: `payment-${record.data.id}`,
        date: record.date,
        invoiceNumber: record.data.referenceNumber ?? '',
        type: 'PAYMENT_PAID',
        productName: `Payment via ${record.data.paymentMethod}`,
        quantity: null,
        unit: null,
        unitPrice: null,
        lineTotal: -Number(record.data.amount),
        runningBalance,
        isPayment: true
      });
    }
  }

  historyRows.reverse();

  const filteredHistoryRows = purchaseTypeFilter === 'ALL'
    ? historyRows
    : historyRows.filter((row) => {
        if (row.isPayment) return true;
        return row.productType === purchaseTypeFilter;
      });

  const totalHistoryRows = filteredHistoryRows.length;
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistoryRows / DEFAULT_PAGE_SIZE));
  const normalizedHistoryPage = Math.min(Math.max(historyPage, 1), totalHistoryPages);
  const paginatedHistoryRows = filteredHistoryRows.slice((normalizedHistoryPage - 1) * DEFAULT_PAGE_SIZE, normalizedHistoryPage * DEFAULT_PAGE_SIZE);

  const buildHistoryHref = (pageNumber: number) => {
    const params = new URLSearchParams({
      ...(success ? { success } : {}),
      ...(error ? { error } : {}),
      ...(purchaseTypeFilter && purchaseTypeFilter !== 'ALL' ? { purchaseTypeFilter } : {})
    });

    if (pageNumber > 1) {
      params.set('historyPage', String(pageNumber));
    }

    const query = params.toString();
    return query ? `/dashboard/companies/${companyId}?${query}` : `/dashboard/companies/${companyId}`;
  };

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
      lineTotal: Number(item.lineTotal ?? 0),
      details: item.description ?? null
    }))
  );

  const feedRows = productRows.filter((row) => row.transactionType === 'PURCHASE');
  const medicineRows = productRows.filter((row) => row.transactionType === 'PURCHASE');

  const companyTypeBadgeClass = company.companyType === 'FEED'
    ? 'bg-amber-100 text-amber-800'
    : company.companyType === 'MEDICINE'
      ? 'bg-rose-100 text-rose-800'
      : company.companyType === 'CHICK'
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-violet-100 text-violet-800';

  const showFeedProducts = company.companyType === 'FEED' || company.companyType === 'FEED_CHICK';
  const showMedicineProducts = company.companyType === 'MEDICINE';
  const showChickProducts = company.companyType === 'CHICK' || company.companyType === 'FEED_CHICK';
  const totalPurchases = Number(summary.totalFeedPurchases ?? 0) + Number(summary.totalMedicinePurchases ?? 0) + Number(summary.totalChickPurchases ?? 0);
  const openingBalance = Number(company.openingBalance ?? 0);
  const amountPayable = Number(summary.currentBalance ?? 0);

  const initialFeedItems = feedItems.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    quantity: Number(item.stockBalance?.quantityOnHand ?? 0),
    buyRate: Number(item.defaultPurchasePrice ?? 0),
    salesRate: Number(item.defaultSellingPrice ?? 0),
    lowStockThreshold: Number(item.lowStockThreshold ?? 0),
    productType: item.productType,
    lastTransactionDate: item.transactionItems[0]?.transaction?.transactionDate,
    companyName: item.company?.name ?? item.transactionItems[0]?.transaction?.company?.name ?? item.transactionItems[0]?.transaction?.party?.name,
    paidAmount: Number(item.transactionItems[0]?.transaction?.paidAmount ?? 0),
    dueAmount: Number(item.transactionItems[0]?.transaction?.dueAmount ?? 0)
  }));

  const initialMedicineItems = medicineItems.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    quantity: Number(item.stockBalance?.quantityOnHand ?? 0),
    buyRate: Number(item.defaultPurchasePrice ?? 0),
    salesRate: Number(item.defaultSellingPrice ?? 0),
    lowStockThreshold: Number(item.lowStockThreshold ?? 0),
    productType: item.productType,
    lastTransactionDate: item.transactionItems[0]?.transaction?.transactionDate,
    companyName: item.company?.name ?? item.transactionItems[0]?.transaction?.company?.name ?? item.transactionItems[0]?.transaction?.party?.name,
    paidAmount: Number(item.transactionItems[0]?.transaction?.paidAmount ?? 0),
    dueAmount: Number(item.transactionItems[0]?.transaction?.dueAmount ?? 0)
  }));

  const initialChickItems = chickItems.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    quantity: Number(item.stockBalance?.quantityOnHand ?? 0),
    buyRate: Number(item.defaultPurchasePrice ?? 0),
    salesRate: Number(item.defaultSellingPrice ?? 0),
    lowStockThreshold: Number(item.lowStockThreshold ?? 0),
    productType: item.productType,
    lastTransactionDate: item.transactionItems[0]?.transaction?.transactionDate,
    companyName: item.company?.name ?? item.transactionItems[0]?.transaction?.company?.name ?? item.transactionItems[0]?.transaction?.party?.name,
    paidAmount: Number(item.transactionItems[0]?.transaction?.paidAmount ?? 0),
    dueAmount: Number(item.transactionItems[0]?.transaction?.dueAmount ?? 0)
  }));

  const exportCsv = [
    ['Company Profile', company.name],
    ['Contact Person', company.contactPerson ?? ''],
    ['Phone', company.phone],
    ['Address', company.address ?? ''],
    ['Company Type', company.companyType],
    [],
    ['Financial Summary'],
    ['Total Feed Purchases', formatCurrency(summary.totalFeedPurchases)],
    ['Total Medicine Purchases', formatCurrency(summary.totalMedicinePurchases)],
    ['Total Payments', formatCurrency(summary.totalPayments)],
    ['Current Due', formatCurrency(summary.totalDue)],
    ['Total Transactions', summary.totalTransactions],
    [],
    ['Transaction History'],
    ['Date', 'Invoice', 'Type', 'Product', 'Quantity', 'Unit Price', 'Line Total', 'Running Balance'],
    ...historyRows.map((row) => [
      formatDate(row.date),
      row.invoiceNumber,
      row.type,
      row.productName,
      row.quantity ?? '',
      row.unitPrice !== null && row.unitPrice !== undefined ? formatCurrency(row.unitPrice) : '',
      formatCurrency(row.lineTotal),
      formatCurrency(row.runningBalance)
    ])
  ]
    .map((row) => row.join(','))
    .join('\n');

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-3 py-5 sm:px-5 lg:px-6">
      <ToastRedirect initialSuccess={success ?? undefined} initialError={error ?? undefined} />

      <div className="mb-5">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/dashboard/companies">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-500/10 text-3xl font-bold text-emerald-600">
              {company.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">{company.name}</h1>
                 <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${companyTypeBadgeClass}`}>
                  {company.companyType === 'FEED' ? 'Feed Company' : company.companyType === 'MEDICINE' ? 'Medicine Company' : company.companyType === 'CHICK' ? 'Hatchling / Chick Company' : 'Feeds + Hatchling / Chick'}
                </span>
              </div>
              <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate font-medium text-foreground">{company.phone || '-'}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{company.address || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <span className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-badge font-semibold ${summary.totalDue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <CheckCircle2 className="h-4 w-4" />
                {summary.totalDue > 0 ? 'Due' : 'Cleared'}
              </span>
              <span className={`inline-flex h-9 items-center rounded-full px-3 text-badge font-semibold ${company.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {company.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <CompanyRowActions
                company={{
                  id: company.id,
                  name: company.name,
                  contactPerson: company.contactPerson,
                  phone: company.phone,
                  email: company.email,
                  address: company.address,
                  companyType: company.companyType,
                  isActive: company.isActive,
                  openingBalance: company.openingBalance,
                  openingBalanceDescription: company.openingBalanceDescription
                }}
                editButtonLabel="Edit Profile"
                editButtonClassName="h-[42px] bg-secondary text-secondary-foreground hover:bg-secondary/80"
              />
              <CompanyProfilePayButton companyId={company.id} />
              {company.companyType !== 'MEDICINE' && (
                <AddStockModal
                  feedCompanies={feedCompanies}
                  medicineCompanies={medicineCompanies}
                  chickCompanies={chickCompanies}
                  feedProducts={initialFeedItems}
                  medicineProducts={initialMedicineItems}
                  chickProducts={initialChickItems}
                  paymentMethodOptions={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'BANK_TRANSFER', label: 'Bank transfer' },
                    { value: 'CHEQUE', label: 'Cheque' },
                    { value: 'MOBILE_MONEY', label: 'Mobile money' },
                    { value: 'OTHER', label: 'Other' }
                  ]}
                  preselectedCompanyId={company.id}
                  preselectedCompanyName={company.name}
                  {...(company.companyType === 'FEED' ? { preselectedCompanyType: 'FEED' } : {})}
                  {...(company.companyType === 'MEDICINE' ? { preselectedCompanyType: 'MEDICINE' } : {})}
                  {...(company.companyType === 'CHICK' ? { preselectedCompanyType: 'CHICK' } : {})}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {[
            { label: 'Total Purchases', value: formatCurrency(totalPurchases), icon: ReceiptText, accent: 'bg-sky-100 text-sky-700' },
            { label: 'Total Payments', value: formatCurrency(summary.totalPayments), icon: CircleDollarSign, accent: 'bg-emerald-100 text-emerald-700' },
            { label: 'Current Due', value: formatCurrency(summary.totalDue), icon: Wallet, accent: 'bg-rose-100 text-rose-700' },
            { label: 'Transactions', value: String(summary.totalTransactions), icon: FileText, accent: 'bg-violet-100 text-violet-700' }
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="flex min-w-0 items-center gap-3 px-5 py-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}><Icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 truncate text-xl font-bold tabular-nums text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_0.9fr]">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold text-muted-foreground">Amount Payable (Total)</p>
          <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-emerald-600 sm:text-4xl">{formatCurrency(amountPayable)}</p>
          <p className="mt-3 text-sm text-muted-foreground">Opening balance + purchases - payments</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Factory className="h-5 w-5" /></div>
            <p className="text-sm font-semibold text-muted-foreground">Opening Balance</p>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-foreground">{formatCurrency(openingBalance)}</p>
          <p className="mt-3 text-sm text-muted-foreground">Outstanding balance before this period</p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><CalendarDays className="h-5 w-5" /></div>
          <div><p className="text-xs font-medium text-muted-foreground">Company Since</p><p className="mt-1 text-lg font-bold text-foreground">{formatDate(company.createdAt)}</p><p className="mt-1 text-xs text-muted-foreground">Account opened on this date</p></div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary shadow-sm"><CircleDollarSign className="h-5 w-5" /></div>
          <div className="mr-auto"><h2 className="text-lg font-semibold text-foreground">Financial Summary</h2><p className="mt-1 text-sm text-muted-foreground">Overview of this period</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${summary.totalDue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{summary.totalDue > 0 ? 'Due' : 'Cleared'}</span>
        </div>
        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center">
          <div><p className="text-muted-foreground">Opening Balance</p><p className="mt-1 text-lg font-bold tabular-nums text-foreground">{formatCurrency(openingBalance)}</p></div>
          <span className="hidden text-2xl text-muted-foreground sm:block">+</span>
          <div><p className="text-muted-foreground">Total Purchases</p><p className="mt-1 text-lg font-bold tabular-nums text-foreground">{formatCurrency(totalPurchases)}</p></div>
          <span className="hidden text-2xl text-muted-foreground sm:block">−</span>
          <div><p className="text-muted-foreground">Total Payments</p><p className="mt-1 text-lg font-bold tabular-nums text-foreground">{formatCurrency(summary.totalPayments)}</p></div>
          <span className="hidden text-2xl text-muted-foreground sm:block">=</span>
          <div className="border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><p className="font-semibold text-primary">Amount Payable</p><p className="mt-1 text-xl font-bold tabular-nums text-foreground">{formatCurrency(amountPayable)}</p></div>
        </div>
        <p className="mt-5 rounded-xl bg-background/80 px-4 py-3 text-sm text-muted-foreground">Current Due ({formatCurrency(summary.totalDue)}) is from this period only. Total Payable ({formatCurrency(amountPayable)}) includes the Opening Balance.</p>
      </section>

      <div className="hidden mt-6 gap-4 lg:grid-cols-2">
        <KpiCard
          title="Current Balance"
          value={Number(summary.currentBalance ?? 0) > 0 ? `🔴 Payable • ${formatCurrency(Number(summary.currentBalance ?? 0))}` : Number(summary.currentBalance ?? 0) < 0 ? `🟢 Advance • ${formatCurrency(Number(summary.currentBalance ?? 0))}` : '⚪ Clear'}
          description="Opening balance plus purchases and payments"
          icon={Wallet}
          accent="bg-violet-100 text-violet-700"
        />
        <KpiCard
          title="Current Due"
          value={formatCurrency(summary.totalDue)}
          description="Outstanding balance for this company"
          icon={Wallet}
          accent="bg-amber-100 text-amber-700"
        />
        <KpiCard
          title="Company Since"
          value={formatDate(company.createdAt)}
          description="Account opened on this date"
          icon={Factory}
          accent="bg-sky-100 text-sky-700"
        />
      </div>

      <section className="hidden my-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Financial Overview</h2>
            <p className="mt-1 text-xs text-muted-foreground">Quick summary of the company account</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${summary.totalDue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {summary.totalDue > 0 ? 'Due' : 'Cleared'}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(company.companyType === 'FEED' || company.companyType === 'FEED_CHICK' || company.companyType === 'BOTH') && (
            <div className="rounded-xl border bg-background p-4">
              <p className="text-sm text-muted-foreground">Total Feed Purchases</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalFeedPurchases)}</p>
            </div>
          )}
          {(company.companyType === 'MEDICINE' || company.companyType === 'BOTH') && (
            <div className="rounded-xl border bg-background p-4">
              <p className="text-sm text-muted-foreground">Total Medicine Purchases</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalMedicinePurchases)}</p>
            </div>
          )}
          {(company.companyType === 'CHICK' || company.companyType === 'FEED_CHICK' || company.companyType === 'BOTH') && (
            <div className="rounded-xl border bg-background p-4">
              <p className="text-sm text-muted-foreground">Total Hatchling / Chick Purchases</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalChickPurchases)}</p>
            </div>
          )}
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalPayments)}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Current Due</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalDue)}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="mt-2 text-2xl font-semibold">{summary.totalTransactions}</p>
          </div>
        </div>
      </section>

      <section className="my-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mt-6">
          {showFeedProducts && (
            <StockManagement
              title="Feed"
              description="Manage company feed products, stock quantity, pricing, and status."
              initialItems={initialFeedItems}
              availableProducts={initialFeedItems}
              suppliers={feedCompanies}
              companyNames={feedCompanies.map((supplier) => ({ value: supplier.name, label: supplier.name }))}
              useCompanySearch
              allowCreateCompany={false}
              addButtonLabel="Add Product"
              asSection
              showAddButton
              defaultCompanyName={company.name}
              defaultCompanyId={company.id}
            />
          )}
          {showMedicineProducts && (
            <StockManagement
              title="Medicine"
              description="Manage company medicine products, stock quantity, pricing, and status."
              initialItems={initialMedicineItems}
              availableProducts={initialMedicineItems}
              suppliers={medicineCompanies}
              companyNames={medicineCompanies.map((supplier) => ({ value: supplier.name, label: supplier.name }))}
              useCompanySearch
              allowCreateCompany={false}
              addButtonLabel="Add Product"
              asSection
              showAddButton
              defaultCompanyName={company.name}
              defaultCompanyId={company.id}
            />
          )}
          {showChickProducts && (
            <StockManagement
              title="Hatchling / Chick"
              description="Manage hatchling/chick products, stock quantity, pricing, and status."
              initialItems={initialChickItems}
              availableProducts={initialChickItems}
              suppliers={chickCompanies}
              companyNames={chickCompanies.map((supplier) => ({ value: supplier.name, label: supplier.name }))}
              useCompanySearch
              allowCreateCompany={false}
              addButtonLabel="Add Product"
              asSection
              showAddButton
              defaultCompanyName={company.name}
              defaultCompanyId={company.id}
              stockType="CHICK"
            />
          )}
        </div>
      </section>

      <section className="my-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Transaction history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Purchase and payment history for this company.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompanyProfileFilter
              purchaseTypeFilter={purchaseTypeFilter}
              companyId={companyId}
              success={success}
              error={error}
              historyPage={historyPage}
            />
            <CompanyProfileActions companyName={company.name} exportData={exportCsv} />
          </div>
        </div>

        {filteredHistoryRows.length === 0 ? (
          <div className="mt-6 rounded-xl border bg-card p-10 text-center text-muted-foreground">
            No transactions or payments found for this company.
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-visible rounded-xl border min-w-0">
              <ResponsiveTable minWidth="1120px">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Product / Description</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 font-medium">Unit Price</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">{formatDate(row.date)}</td>
                      <td className="px-4 py-3">{row.invoiceNumber || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          row.type === 'PURCHASE' ? 'bg-amber-100 text-amber-800' :
                          row.type === 'PAYMENT_PAID' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{row.productName}</td>
                      <td className="px-4 py-3">{row.quantity ?? '-'} {row.unit ?? ''}</td>
                      <td className="px-4 py-3">{row.unitPrice !== null && row.unitPrice !== undefined ? formatCurrency(row.unitPrice) : '-'}</td>
                      <td className={`px-4 py-3 font-medium ${row.isPayment ? 'text-emerald-700' : ''}`}>{formatCurrency(row.lineTotal)}</td>
                      <td className="px-4 py-3">
                        {row.transactionId ? (
                          <a
                            href={`/dashboard/transactions/${row.transactionId}/print`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-md border border-border px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-muted"
                          >
                            <Printer className="mr-1 h-3.5 w-3.5" />
                            Print
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(row.runningBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </ResponsiveTable>
            </div>
            {totalHistoryRows > DEFAULT_PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-end">
                <Pagination currentPage={normalizedHistoryPage} totalPages={totalHistoryPages} hrefBuilder={buildHistoryHref} />
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
