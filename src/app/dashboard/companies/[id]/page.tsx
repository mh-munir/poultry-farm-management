import { MapPin, Phone, ReceiptText, Wallet2, Package2, Factory, Printer } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { getCompanyAccountSummary, getCompanyProfile } from '@/features/companies/actions';
import { CompanyRowActions } from '@/app/dashboard/parties/company-row-actions';
import { CompanyProfileActions } from './company-profile-actions';
import { CompanyProfilePayButton } from './company-profile-pay-button';
import ToastRedirect from '../toast-redirect';

type CompanyProfileRecord = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  companyType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default async function CompanyProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ success?: string; error?: string }> }) {
  await requireUser();
  const { id } = await params;
  const companyId = Number(id);
  const sp = await searchParams;
  const success = sp?.success ?? '';
  const error = sp?.error ?? '';

  const company = await prisma.company.findUnique({
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
      createdAt: true,
      updatedAt: true
    }
  }) as CompanyProfileRecord | null;

  if (!company) notFound();

  const [transactions, payments, summary] = await Promise.all([
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
    getCompanyAccountSummary(companyId)
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
      : 'bg-violet-100 text-violet-800';

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
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <ToastRedirect initialSuccess={success ?? undefined} initialError={error ?? undefined} />
      <div className="min-w-0 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="min-w-0 space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border bg-muted text-3xl font-semibold text-muted-foreground">
                {company.name.charAt(0).toUpperCase()}
              </div>
              <h1 className="mt-4 text-2xl font-semibold leading-tight">{company.name}</h1>
              <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${companyTypeBadgeClass}`}>
                {company.companyType === 'FEED' ? 'Feed Company' : company.companyType === 'MEDICINE' ? 'Medicine Company' : 'Feed & Medicine'}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {company.contactPerson && (
                <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                  <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Contact Person</p>
                    <p className="mt-0.5 truncate text-sm font-semibold">{company.contactPerson}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Mobile Number</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{company.phone}</p>
                </div>
              </div>
              {company.address && (
                <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Address</p>
                    <p className="mt-0.5 truncate text-sm font-semibold">{company.address}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                <ReceiptText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Total Transactions</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{summary.totalTransactions}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                <Package2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Company Since</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{formatDate(company.createdAt)}</p>
                </div>
              </div>
              {summary.lastTransactionDate && (
                <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
                  <ReceiptText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Last Transaction Date</p>
                    <p className="mt-0.5 truncate text-sm font-semibold">{formatDate(summary.lastTransactionDate)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <CompanyRowActions
                company={{
                  id: company.id,
                  name: company.name,
                  contactPerson: company.contactPerson,
                  phone: company.phone,
                  email: company.email,
                  address: company.address,
                  companyType: company.companyType,
                  isActive: company.isActive
                }}
              />
              <CompanyProfilePayButton companyId={company.id} />
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Financial Overview</h2>
                <p className="mt-1 text-xs text-muted-foreground">Quick summary of the company account</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${summary.totalDue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {summary.totalDue > 0 ? 'Due' : 'Cleared'}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Total Feed Purchases</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalFeedPurchases)}</p>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Total Medicine Purchases</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalMedicinePurchases)}</p>
              </div>
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

          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Transaction history</h2>
                <p className="mt-1 text-sm text-muted-foreground">Purchase and payment history for this company.</p>
              </div>
              <div className="flex items-center gap-2">
                <CompanyProfileActions companyName={company.name} exportData={exportCsv} />
              </div>
            </div>

            {historyRows.length === 0 ? (
              <div className="mt-6 rounded-xl border bg-card p-10 text-center text-muted-foreground">
                No transactions or payments found for this company.
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-xl border min-w-0">
                <div className="overflow-x-auto">
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
                          <td className="px-4 py-3">{row.quantity ?? '-'}</td>
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
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
