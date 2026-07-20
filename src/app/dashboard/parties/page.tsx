import Link from 'next/link';
import { Receipt, Users, Package2 } from 'lucide-react';
import type { Decimal } from '@prisma/client/runtime/library';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/stat-card';
import { AddPartyDialog } from '@/app/dashboard/parties/add-party-dialog';
import { getPartyNames, getPartyPageData, getPartyStats } from '@/features/parties/actions';

const PARTY_TYPES = ['ALL', 'CUSTOMER', 'SUPPLIER', 'BOTH'] as const;
const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE'] as const;

function formatCurrency(value: number | string | Decimal | null | undefined) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(number);
}

function formatPartyType(type: string) {
  return type.replace('_', ' ');
}

export default async function PartiesPage({
  searchParams
}: {
  searchParams?: Promise<{ page?: string; search?: string; partyType?: string; status?: string; error?: string; success?: string }>;
}) {
  await requireUser();

  const params = await searchParams;
  const page = Number(params?.page ?? '1');
  const search = params?.search ?? '';
  const partyType = params?.partyType ?? 'ALL';
  const status = params?.status ?? 'ALL';
  const error = params?.error ?? '';
  const success = params?.success ?? '';

  const [data, stats, partyOptions] = await Promise.all([
    getPartyPageData({ page, search, partyType, status }),
    getPartyStats({ search, partyType, status }),
    getPartyNames()
  ]);

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
        <div className="mb-6">
          <h1 className="mt-2 text-3xl font-semibold">Manage customers and suppliers</h1>
        </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm mb-6">
        <div className="grid gap-4 md:grid-cols-4 flex-1">
          <StatCard title="Total Parties" value={stats.total} icon={Users} accent="bg-indigo-50 text-indigo-600" />
          <StatCard title="Active Parties" value={stats.active} icon={Package2} accent="bg-emerald-50 text-emerald-600" />
          <StatCard title="Customers" value={stats.customers} icon={Receipt} accent="bg-sky-50 text-sky-600" />
          <StatCard title="Suppliers" value={stats.suppliers} icon={Receipt} accent="bg-amber-50 text-amber-600" />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
          <AddPartyDialog partyOptions={partyOptions} />
      </div>

      {(error || success) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {error || success}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Party Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Feed quantity</th>
                <th className="px-4 py-3 font-medium">Feed price</th>
                <th className="px-4 py-3 font-medium">Feed name</th>
                <th className="px-4 py-3 font-medium">Medicine quantity</th>
                <th className="px-4 py-3 font-medium">Medicine price</th>
                <th className="px-4 py-3 font-medium">Media name</th>
                <th className="px-4 py-3 font-medium">Farm name</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.parties.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                    No parties found. Create your first party to get started.
                  </td>
                </tr>
              ) : (
                data.parties.map((party) => (
                  <tr key={party.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{party.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{party.partyType}</span>
                    </td>
                    <td className="px-4 py-3">{party.feedQuantity != null ? party.feedQuantity.toString() : '—'}</td>
                    <td className="px-4 py-3">{party.feedPrice != null ? formatCurrency(party.feedPrice) : '—'}</td>
                    <td className="px-4 py-3">{party.feedName ?? '—'}</td>
                    <td className="px-4 py-3">{party.medicineQuantity != null ? party.medicineQuantity.toString() : '—'}</td>
                    <td className="px-4 py-3">{party.medicinePrice != null ? formatCurrency(party.medicinePrice) : '—'}</td>
                    <td className="px-4 py-3">{party.mediaName ?? '—'}</td>
                    <td className="px-4 py-3">{party.farmName ?? '—'}</td>
                    <td className="px-4 py-3">{party.address ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/parties/${party.id}/edit`}>Edit</Link>
                        </Button>
                        <form action="/dashboard/parties/delete" method="post">
                          <input type="hidden" name="partyId" value={party.id} />
                          <Button variant="destructive" size="sm" type="submit">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {data.parties.length} of {data.total} parties
          </p>
          <div className="flex items-center gap-2">
            {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((pageNumber) => {
              const params = new URLSearchParams({
                ...(search ? { search } : {}),
                ...(partyType && partyType !== 'ALL' ? { partyType } : {}),
                ...(status && status !== 'ALL' ? { status } : {})
              });
              params.set('page', String(pageNumber));

              return (
                <Link
                  key={pageNumber}
                  href={`/dashboard/parties?${params.toString()}`}
                  className={`rounded-md px-3 py-2 text-sm ${page === pageNumber ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}
                >
                  {pageNumber}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
