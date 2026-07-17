import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Search, Filter, Receipt, Users, Package2, ArrowLeft } from 'lucide-react';
import type { Decimal } from '@prisma/client/runtime/library';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getPartyPageData, getPartyStats } from '@/features/parties/actions';

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

  const [data, stats] = await Promise.all([getPartyPageData({ page, search, partyType, status }), getPartyStats()]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Party Module</p>
          <h1 className="mt-2 text-3xl font-semibold">Manage customers and suppliers</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create, update, search, filter, and track opening balances for parties without touching the ledger yet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/parties/new">
              <Plus className="h-4 w-4" />
              New Party
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" /> Total Parties
          </div>
          <div className="mt-3 text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package2 className="h-4 w-4" /> Active Parties
          </div>
          <div className="mt-3 text-2xl font-semibold">{stats.active}</div>
        </div>
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" /> Customers
          </div>
          <div className="mt-3 text-2xl font-semibold">{stats.customers}</div>
        </div>
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" /> Suppliers
          </div>
          <div className="mt-3 text-2xl font-semibold">{stats.suppliers}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <form className="flex flex-col gap-3 lg:flex-row lg:items-end" method="get">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">Search</label>
            <div className="flex items-center rounded-md border bg-background px-3">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <input
                name="search"
                defaultValue={search}
                placeholder="Search by name, email, phone or tax number"
                className="w-full bg-transparent px-2 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="w-full lg:w-48">
            <label className="mb-2 block text-sm font-medium">Party type</label>
            <div className="flex items-center rounded-md border bg-background px-3">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <select name="partyType" defaultValue={partyType} className="w-full bg-transparent px-2 py-2 text-sm outline-none">
                {PARTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === 'ALL' ? 'All Types' : formatPartyType(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full lg:w-48">
            <label className="mb-2 block text-sm font-medium">Status</label>
            <select name="status" defaultValue={status} className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none">
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'ALL' ? 'All Status' : option}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit">Apply</Button>
        </form>
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
                <th className="px-4 py-3 font-medium">Party</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Opening Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.parties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No parties found. Create your first party to get started.
                  </td>
                </tr>
              ) : (
                data.parties.map((party) => (
                  <tr key={party.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{party.name}</div>
                      <div className="text-xs text-muted-foreground">{party.address ?? 'No address provided'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{party.partyType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>{party.phone ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{party.email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(party.openingBalance)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${party.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {party.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
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
