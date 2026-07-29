import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getPartyStatementData } from '@/features/reports/actions';
import { prisma } from '@/server/db';
import { getBranding } from '@/lib/branding';
import { Landmark } from 'lucide-react';
import PrintButton from './print-button';

function formatCurrency(value: number) {
  return `৳ ${new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default async function PartyStatementReportPage({
  searchParams
}: {
  searchParams?: Promise<{ party?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const partyId = params?.party ? Number(params.party) : undefined;

  const [parties, branding] = await Promise.all([
    prisma.party.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, partyType: true }
    }),
    getBranding()
  ]);

  const data = partyId ? await getPartyStatementData(partyId) : { party: null, entries: [], summary: null };
  const appName = branding?.name ?? 'Poultry Farm Management';
  const appLogo = branding?.logo ?? null;
  const printDate = new Date();

  return (
    <main className="mx-auto min-h-[80vh] max-w-5xl px-4 py-8">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Party Statement</h1>
            <p className="mt-2 text-sm text-muted-foreground">Account statement with transaction history and outstanding balances.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/reports">Back to Reports</Link>
            </Button>
            {data.party && <PrintButton />}
          </div>
        </div>

        <div className="mt-6">
          <form method="get" className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Select Party:</label>
            <select name="party" defaultValue={params?.party || ''} className="rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select a party</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>{party.name} ({party.partyType === 'CUSTOMER' ? 'Customer' : party.partyType === 'PARTY' ? 'Party Supplier' : party.partyType === 'COMPANY' ? 'Company Supplier' : 'Customer + Party Supplier'})</option>
              ))}
            </select>
            <Button type="submit" size="sm">View Statement</Button>
          </form>
        </div>

        {data.party && data.summary && (
          <>
            {/* Company / Application Branding */}
            <div className="mt-8 flex items-center gap-4 border-b pb-6">
              {appLogo ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
                  <img src={appLogo} alt={appName} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700">
                  <Landmark className="h-7 w-7" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{appName}</h2>
                <p className="text-sm text-slate-500">Account Statement</p>
              </div>
              <div className="ml-auto text-sm text-slate-500">
                <p>Generated: {formatDateTime(printDate)}</p>
              </div>
            </div>

            {/* Party Information */}
            <div className="mt-6 rounded-xl border bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>Party Information</span>
              </div>
              <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-medium text-slate-800">Party Name</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{data.party.name}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Party Type</p>
                  <p>{data.party.partyType === 'CUSTOMER' ? 'Customer' : data.party.partyType === 'PARTY' ? 'Party Supplier (Eggs & Chicken)' : 'Customer + Party Supplier'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Statement Date</p>
                  <p>{formatDate(printDate)}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Statement No</p>
                  <p>{data.party.id.toString().padStart(6, '0')}</p>
                </div>
              </div>
            </div>

            {/* Statement Summary */}
            <div className="mt-6 rounded-xl border bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>Statement Summary</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Sales</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(data.summary.totalSales)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Customer Payments</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(data.summary.totalCustomerPayments)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Customer Due</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(data.summary.customerDue)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Purchases</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(data.summary.totalPurchases)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Party Supplier Payments</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(data.summary.totalSupplierPayments)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Party Supplier Payable</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(data.summary.supplierDue)}</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Net Balance</p>
                  <p className={`mt-2 text-xl font-semibold ${data.summary.netBalance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(Math.abs(data.summary.netBalance))}
                    {data.summary.netBalance >= 0 ? ' Receivable' : ' Payable'}
                  </p>
                </div>
              </div>
            </div>

            {/* Ledger Entries */}
            <div className="mt-6 rounded-xl border bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Ledger Entries</h3>
                <span className="text-sm text-slate-500">{data.entries.length} entries</span>
              </div>
              {data.entries.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No transactions found for this party.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">Description</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-700">Debit</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-700">Credit</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-700">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">{formatDate(entry.date)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              entry.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' :
                              entry.type === 'PURCHASE' ? 'bg-sky-100 text-sky-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {entry.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">{entry.description}</td>
                          <td className="px-4 py-3 text-right">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                          <td className="px-4 py-3 text-right">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                          <td className={`px-4 py-3 text-right font-medium ${entry.balance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(Math.abs(entry.balance))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
