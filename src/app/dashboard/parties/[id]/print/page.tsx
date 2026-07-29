import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import PrintTrigger from './print-trigger';
import { getBranding } from '@/lib/branding';
import { Receipt, Landmark, BadgeCheck, Wallet, Package, CircleDollarSign, UserRound } from 'lucide-react';
import styles from './print-styles.module.css';

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

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function StatementCard({
  title,
  value,
  subtext,
  icon: Icon
}: {
  title: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:border-slate-300 print:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtext}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2 text-slate-700 print:bg-white">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={6} className="border-t border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
        {label}
      </td>
    </tr>
  );
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

  const totalSales = customerRows.reduce((s, r) => s + (r.lineTotal ?? 0), 0);
  const totalSupplies = supplierRows.reduce((s, r) => s + (r.lineTotal ?? 0), 0);
  const totalPayments = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const currentDue = totalSales - totalPayments;
  const supplierPayable = totalSupplies - totalPayments;
  const openingBalance = Number(party.openingBalance ?? 0);
  const netBalance = openingBalance + currentDue - supplierPayable;
  const printDate = new Date();

  return (
    <div className={`${styles.printPage} min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:px-0 print:py-0`}>
      <PrintTrigger />
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none print:p-0">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 print:border-0 print:bg-white print:p-0">
          <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              {branding.logo ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 print:border-slate-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={branding.logo} alt={branding.name ?? 'Brand logo'} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 print:border-slate-300">
                  <Landmark className="h-8 w-8" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{branding.name ?? 'Islamabad Feeds & Medicine Center'}</h1>
                <p className="mt-1 text-sm text-slate-600">House 12, Sector G-10/4, Islamabad</p>
                <p className="text-sm text-slate-600">+92 333 1234567 • info@islamabadfeeds.com</p>
              </div>
            </div>

            <div className="text-sm text-slate-600 md:text-right">
              <p className="font-semibold text-slate-900">Printed {formatDate(printDate)}</p>
              <p className="mt-1">Statement No: {party.id.toString().padStart(4, '0')}</p>
              <p className="mt-1">Party Type: {party.partyType === 'CUSTOMER' ? 'Customer' : party.partyType === 'PARTY' ? 'Party Supplier (Eggs & Chicken)' : 'Customer + Party Supplier'}</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">Account Statement</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">PARTY ACCOUNT STATEMENT</h2>
          </div>

          <div className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1.15fr_0.85fr] print:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserRound className="h-4 w-4" />
                <span>Party Information</span>
              </div>
              <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="font-medium text-slate-800">Party Name</p>
                  <p>{party.name}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Mobile</p>
                  <p>{party.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Address</p>
                  <p>{party.address ?? '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Farm Name</p>
                  <p>{party.farmName ?? '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Opening Balance</p>
                  <p>{formatCurrency(openingBalance)}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Current Status</p>
                  <p>{party.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BadgeCheck className="h-4 w-4" />
                <span>Statement Summary</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Opening Balance</span>
                  <span className="font-medium text-slate-900">{formatCurrency(openingBalance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current Due</span>
                  <span className="font-medium text-slate-900">{formatCurrency(currentDue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Party Supplier Payable</span>
                  <span className="font-medium text-slate-900">{formatCurrency(supplierPayable)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-900">Net Balance</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(netBalance)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatementCard title="Customer" value={formatCurrency(totalSales)} subtext="Total Sales" icon={Receipt} />
            <StatementCard title="Customer" value={formatCurrency(totalPayments)} subtext="Total Paid" icon={Wallet} />
            <StatementCard title="Party Supplier" value={formatCurrency(totalSupplies)} subtext="Total Supplies" icon={Package} />
            <StatementCard title="Balance" value={formatCurrency(netBalance)} subtext="Net Balance" icon={CircleDollarSign} />
          </div>

          <div className="mt-8 space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Sales History</h3>
                <span className="text-sm text-slate-500">{customerRows.length} entries</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Date</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Invoice</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Product</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Qty</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Unit</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Rate</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {customerRows.length > 0 ? customerRows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(row.transactionDate)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{row.invoiceNumber ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{row.productName}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{row.quantity}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{row.unit}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatCurrency(row.unitPrice)}</td>
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-900">{formatCurrency(row.lineTotal)}</td>
                      </tr>
                    )) : <EmptyState label="No sales found" />}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Supply History</h3>
                <span className="text-sm text-slate-500">{supplierRows.length} entries</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Date</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Invoice</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Product</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Qty</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Unit</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Rate</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {supplierRows.length > 0 ? supplierRows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(row.transactionDate)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{row.invoiceNumber ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{row.productName}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{row.quantity}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{row.unit}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatCurrency(row.unitPrice)}</td>
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-900">{formatCurrency(row.lineTotal)}</td>
                      </tr>
                    )) : <EmptyState label="No supplies found" />}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Payment History</h3>
                <span className="text-sm text-slate-500">{payments.length} entries</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Date</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Type</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Amount</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Method</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Reference</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-700">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {payments.length > 0 ? payments.map((payment) => (
                      <tr key={payment.id} className="align-top">
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(payment.paymentDate)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{payment.paymentMethod}</td>
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-900">{formatCurrency(payment.amount)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{payment.paymentMethod}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{payment.referenceNumber ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{payment.notes ?? '—'}</td>
                      </tr>
                    )) : <EmptyState label="No payments found" />}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 print:bg-white">
            <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Generated by</p>
                <p>Islamabad Poultry Management System</p>
                <p>Generated Date & Time: {formatDateTime(printDate)}</p>
                <p>Printed By: {party.name}</p>
              </div>
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Authorized Signature</p>
                <div className="mt-3 h-12 w-40 border-b border-slate-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
              <span>Confidential statement</span>
              <span>Page 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
