import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getPartyStatementData } from '@/features/reports/actions';
import { prisma } from '@/server/db';

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

export default async function PartyStatementReportPage({
  searchParams
}: {
  searchParams?: Promise<{ party?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const partyId = params?.party ? Number(params.party) : undefined;

  const parties = await prisma.party.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, partyType: true }
  });

  const data = partyId ? await getPartyStatementData(partyId) : { party: null, entries: [], summary: null };

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Party Statement</h1>
            <p className="mt-2 text-sm text-muted-foreground">Present outstanding balances and transaction history for each party.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports">Back to Reports</Link>
          </Button>
        </div>

        <div className="mt-6">
          <form method="get" className="flex items-center gap-3">
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
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.summary.totalSales)}</p>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Customer Payments</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.summary.totalCustomerPayments)}</p>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Customer Due</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.summary.customerDue)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.summary.totalPurchases)}</p>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Party Supplier Payments</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.summary.totalSupplierPayments)}</p>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Party Supplier Payable</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.summary.supplierDue)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border bg-background p-4">
              <h3 className="text-lg font-semibold">Net Balance</h3>
              <p className={`mt-2 text-2xl font-semibold ${data.summary.netBalance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(Math.abs(data.summary.netBalance))}
                {data.summary.netBalance >= 0 ? ' Receivable' : ' Payable'}
              </p>
            </div>

            <div className="mt-6 rounded-xl border bg-background p-4">
              <h3 className="text-lg font-semibold">Ledger Entries</h3>
              {data.entries.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No transactions found for this party.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Description</th>
                        <th className="px-4 py-3 text-right font-medium">Debit</th>
                        <th className="px-4 py-3 text-right font-medium">Credit</th>
                        <th className="px-4 py-3 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">{formatDate(entry.date)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${entry.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' : entry.type === 'PURCHASE' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'}`}>
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
