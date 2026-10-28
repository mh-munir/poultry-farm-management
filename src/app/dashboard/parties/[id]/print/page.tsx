import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { prisma } from '@/server/db';
import PrintTrigger from './print-trigger';
import { getBranding } from '@/lib/branding';
import { getPartyFinancialSummary } from '@/features/parties/accounting';
import { Receipt, BadgeCheck, Wallet, Package, CircleDollarSign, UserRound } from 'lucide-react';
import { formatDateBD as formatDate, formatDateTimeBD as formatDateTime } from '@/lib/dates';
import { getDictionary } from '@/i18n';
import { getLocaleFromValue, LOCALE_COOKIE } from '@/i18n/config';

function formatCurrency(value: number | string | { toString(): string } | null | undefined) {
  const number = Number(value?.toString() ?? 0);
  return `৳ ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)}`;
}

// using centralized Bangladesh-aware formatters

function StatementCard({
  title,
  value,
  subtext,
  icon: Icon,
  valueClassName
}: {
  title: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:border-slate-300 print:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className={`mt-2 text-xl font-semibold ${valueClassName ?? 'text-slate-900'}`}>{value}</p>
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
      <td colSpan={5} className="border-t border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
        {label}
      </td>
    </tr>
  );
}

export default async function PartyPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const cookieStore = await cookies();
  const dict = getDictionary(getLocaleFromValue(cookieStore.get(LOCALE_COOKIE)?.value));
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

  const financialSummary = await getPartyFinancialSummary(partyId);
  const currentDue = Number(financialSummary.customerDue);
  const supplierPayable = Number(financialSummary.supplierPayable);
  const openingBalance = Number(party.openingBalance ?? 0);
  const netBalance = currentDue - supplierPayable;
  const printDate = new Date();
  const formatPaymentMethod = (method: string) => {
    if (method === 'Cash') return dict.paymentMethods.cash;
    if (method === 'Bank') return dict.paymentMethods.bank;
    if (method === 'Mobile') return dict.paymentMethods.mobile;
    if (method === 'Cheque') return dict.paymentMethods.cheque;
    return method;
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:px-0 print:py-0">
      <PrintTrigger />
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-0 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none print:p-0">
        <div className="overflow-hidden">
          <header className="bg-white p-6 border-b border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center overflow-hidden rounded border bg-white">
                  {branding.logo ? (
                    <img src={branding.logo} alt={branding.name ?? 'Brand logo'} className="h-full w-full object-contain" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded text-slate-500 font-semibold">{dict.common.partyPrintLogo}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-slate-600 font-semibold">{branding.name ?? 'Islamabad Feeds & Medicine Center'}</div>
                  <div className="text-xs text-slate-400">{(branding.name ? '' : 'House 12, Sector G-10/4, Islamabad • +92 333 1234567')}</div>
                </div>
              </div>

              <div className="flex-1 mx-6 hidden md:block">
                <div className="h-5 bg-yellow-400 w-full rounded" />
              </div>

              <div className="text-right">
                <div className="text-4xl md:text-5xl font-extrabold tracking-wider text-slate-950">{dict.forms.statement}</div>
              </div>
            </div>
          </header>

          <div className="h-3 bg-yellow-400" />

          <main className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-start">
              <div>
                <div className="text-xs text-slate-500">{dict.common.partyPrintPartyLabel}</div>
                <div className="font-medium text-slate-900 text-lg">{party.name}</div>
                <div className="mt-1 text-sm text-slate-600">{party.address ?? '—'}</div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500">{dict.common.partyPrintPrinted}</div>
                <div className="font-medium text-slate-900">{formatDate(printDate)}</div>
                <div className="mt-2 text-xs text-slate-500">{dict.common.partyPrintStatementNumber}</div>
                <div className="font-medium text-slate-900">{party.id.toString().padStart(4, '0')}</div>
              </div>
            </div>
          </main>

          <div className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1.15fr_0.85fr] print:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserRound className="h-4 w-4" />
                <span>{dict.common.partyInformation}</span>
              </div>
              <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="font-medium text-slate-800">{dict.common.partyPrintPartyName}</p>
                  <p>{party.name}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">{dict.forms.mobileLabel}</p>
                  <p>{party.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">{dict.common.address}</p>
                  <p>{party.address ?? '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">{dict.forms.farmNameLabel}</p>
                  <p>{party.farmName ?? '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">{dict.common.openingBalanceLabel}</p>
                  <p>{formatCurrency(openingBalance)}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">{dict.common.partyPrintCurrentStatus}</p>
                  <p>{party.isActive ? dict.common.active : dict.common.inactive}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BadgeCheck className="h-4 w-4" />
                <span>{dict.common.partyPrintStatementSummary}</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>{party.openingBalanceType === 'CUSTOMER_ADVANCE' ? dict.common.profileOpeningAdvance : dict.common.profileOpeningDue}</span>
                  <span className="font-medium text-slate-900">{formatCurrency(Math.abs(openingBalance))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{dict.common.totalFeedMedicineSales}</span>
                  <span className="font-medium text-slate-900">{formatCurrency(financialSummary.customerSales)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{dict.common.totalPaidByCustomer}</span>
                  <span className="font-medium text-slate-900">{formatCurrency(financialSummary.customerPayments)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{dict.common.totalEggChickenPurchases}</span>
                  <span className="font-medium text-slate-900">{formatCurrency(financialSummary.supplierPurchases)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{dict.common.totalPaidToSupplier}</span>
                  <span className="font-medium text-slate-900">{formatCurrency(financialSummary.supplierPayments)}</span>
                </div>
                <div className="mt-3">
                  <div className={`flex items-center justify-between px-4 py-3 ${netBalance > 0 ? 'bg-emerald-100' : netBalance < 0 ? 'bg-rose-100' : 'bg-slate-100'}`}>
                    <div className={`text-sm font-semibold ${netBalance > 0 ? 'text-emerald-800' : netBalance < 0 ? 'text-rose-800' : 'text-slate-900'}`}>
                      {netBalance > 0 ? dict.common.customerDue : netBalance < 0 ? dict.common.supplierDue : dict.common.netBalance}
                    </div>
                    <div className={`text-xl font-extrabold ${netBalance > 0 ? 'text-emerald-700' : netBalance < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{formatCurrency(Math.abs(netBalance))}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
            <StatementCard title={dict.common.customerAccount} value={formatCurrency(financialSummary.customerSales)} subtext={dict.common.totalFeedMedicineSales} icon={Receipt} />
            <StatementCard title={dict.common.customerAccount} value={formatCurrency(financialSummary.customerPayments)} subtext={dict.common.totalPaid} icon={Wallet} />
            <StatementCard title={dict.common.supplierAccount} value={formatCurrency(financialSummary.supplierPurchases)} subtext={dict.common.totalEggChickenPurchases} icon={Package} />
            <StatementCard title={dict.common.supplierAccount} value={formatCurrency(financialSummary.supplierPayments)} subtext={dict.common.totalPaid} icon={CircleDollarSign} />
            <StatementCard
              title={netBalance > 0 ? dict.common.customerDue : netBalance < 0 ? dict.common.supplierDue : dict.common.netBalance}
              value={formatCurrency(Math.abs(netBalance))}
              subtext={dict.common.netBalance}
              icon={CircleDollarSign}
              valueClassName={netBalance > 0 ? 'text-emerald-700' : netBalance < 0 ? 'text-rose-700' : 'text-slate-900'}
            />
          </div>

          <div className="mt-8 space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{dict.common.partyPrintSalesHistory}</h3>
                <span className="text-sm text-slate-500">{customerRows.length} {dict.forms.entries}</span>
              </div>
              <div className="overflow-visible rounded-xl border border-slate-200">
                <ResponsiveTable minWidth="900px">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.date}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.invoice}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.product}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.quantity}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.unitPrice}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {customerRows.length > 0 ? customerRows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(row.transactionDate)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{row.invoiceNumber ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{row.productName}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{row.quantity} {row.unit}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatCurrency(row.unitPrice)}</td>
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-900">{formatCurrency(row.lineTotal)}</td>
                      </tr>
                    )) : <EmptyState label={dict.common.partyPrintNoSalesFound} />}
                  </tbody>
                </table>
                </ResponsiveTable>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{dict.common.partyPrintSupplyHistory}</h3>
                <span className="text-sm text-slate-500">{supplierRows.length} {dict.forms.entries}</span>
              </div>
              <div className="overflow-visible rounded-xl border border-slate-200">
                <ResponsiveTable minWidth="900px">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.date}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.invoice}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.product}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.quantity}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.unitPrice}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {supplierRows.length > 0 ? supplierRows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(row.transactionDate)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{row.invoiceNumber ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{row.productName}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{row.quantity} {row.unit}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatCurrency(row.unitPrice)}</td>
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-900">{formatCurrency(row.lineTotal)}</td>
                      </tr>
                    )) : <EmptyState label={dict.common.partyPrintNoSuppliesFound} />}
                  </tbody>
                </table>
                </ResponsiveTable>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{dict.common.partyPrintPaymentHistory}</h3>
                <span className="text-sm text-slate-500">{payments.length} {dict.forms.entries}</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <ResponsiveTable minWidth="820px">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.date}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.type}</th>
                      <th className="px-3 py-3 text-left">{dict.tableHeaders.amount}</th>
                      <th className="px-3 py-3 text-left">{dict.common.partyPrintPaymentMethod}</th>
                      <th className="px-3 py-3 text-left">{dict.common.referenceNumber}</th>
                      <th className="px-3 py-3 text-left">{dict.common.partyPrintRemarks}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {payments.length > 0 ? payments.map((payment) => (
                      <tr key={payment.id} className="align-top">
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(payment.paymentDate)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatPaymentMethod(payment.paymentMethod)}</td>
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-900">{formatCurrency(payment.amount)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatPaymentMethod(payment.paymentMethod)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{payment.referenceNumber ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{payment.notes ?? '—'}</td>
                      </tr>
                    )) : <EmptyState label={dict.common.partyPrintNoPaymentsFound} />}
                  </tbody>
                </table>
                </ResponsiveTable>
              </div>
            </section>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 print:bg-white">
            <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{dict.common.partyPrintGeneratedBy}</p>
                <p>{dict.common.partyPrintSystemName}</p>
                <p>{dict.common.partyPrintGeneratedDateTime}: {formatDateTime(printDate)}</p>
                <p>{dict.common.partyPrintPrintedBy}: {party.name}</p>
              </div>
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{dict.common.partyPrintAuthorizedSignature}</p>
                <div className="mt-3 h-12 w-40 border-b border-slate-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
              <span>{dict.common.partyPrintConfidentialStatement}</span>
              <span>{dict.common.page} 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
