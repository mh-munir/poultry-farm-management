import Link from 'next/link';
import { Receipt, Users, Package2 } from 'lucide-react';
import type { Decimal } from '@prisma/client/runtime/library';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/stat-card';
import { AddPartyDialog } from '@/app/dashboard/parties/add-party-dialog';
import { PartyToast } from './party-toast';
import { PartySearchForm } from './search-form';
import { PartyRowActions } from './party-row-actions';
import { SupplierProductsDisplay } from './supplier-products-display';
import { getPartyNames, getPartyPageData, getPartyStats } from '@/features/parties/actions';
import { getProductsForSales } from '@/features/sales/actions';

const PARTY_TYPES = ['ALL', 'CUSTOMER', 'SUPPLIER', 'BOTH'] as const;
const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE'] as const;

function formatCurrency(value: number | string | Decimal | null | undefined) {
  const number = Number(value ?? 0);
  return `৳ ${number.toFixed(2)}`;
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

  const cookiesStore = await cookies();
  const partySuccessCookie = cookiesStore.get('partySuccess');
  const success = partySuccessCookie?.value ?? '';

  const params = await searchParams;
  const page = Number(params?.page ?? '1');
  const search = params?.search ?? '';
  const partyType = params?.partyType ?? 'ALL';
  const status = params?.status ?? 'ALL';
  const error = params?.error ?? '';

  const [data, stats, partyOptions, products] = await Promise.all([
    getPartyPageData({ page, search, partyType, status }),
    getPartyStats({ search, partyType, status }),
    getPartyNames(),
    getProductsForSales()
  ]);

  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
    code: product.code,
    productType: product.productType,
    unit: product.unit,
    defaultSellingPrice: Number(product.defaultSellingPrice ?? 0),
    stockQuantity: Number(product.stockBalance?.quantityOnHand ?? 0)
  }));

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

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-6 justify-between">
          <AddPartyDialog partyOptions={partyOptions} productOptions={productOptions} />
          <PartySearchForm search={search} partyType={partyType} status={status} />
      </div>

      <PartyToast success={success} error={error} />

      {/* All Parties Table with Pagination */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-4 py-4 bg-muted/20">
          <h2 className="text-lg font-semibold">All Parties</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Party Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Feed quantity</th>
                <th className="px-4 py-3 font-medium">Feed price</th>
                <th className="px-4 py-3 font-medium">Medicine quantity</th>
                <th className="px-4 py-3 font-medium">Medicine price</th>
                <th className="px-4 py-3 font-medium">Supplier Products</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
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
                      <Link
                        href={`/dashboard/parties/${party.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {party.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        party.partyType === 'CUSTOMER' ? 'bg-sky-100 text-sky-800' :
                        party.partyType === 'SUPPLIER' ? 'bg-amber-100 text-amber-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {party.partyType === 'CUSTOMER' ? 'Customer' : party.partyType === 'SUPPLIER' ? 'Supplier' : 'Both'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{party.feedQuantity != null ? party.feedQuantity.toString() : '—'}</td>
                    <td className="px-4 py-3">{party.feedPrice != null ? formatCurrency(party.feedPrice) : '—'}</td>
                    <td className="px-4 py-3">{party.medicineQuantity != null ? party.medicineQuantity.toString() : '—'}</td>
                    <td className="px-4 py-3">{party.medicinePrice != null ? formatCurrency(party.medicinePrice) : '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {party.partyType === 'SUPPLIER' || party.partyType === 'BOTH' ? (
                        <SupplierProductsDisplay partyId={party.id} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(party.totalDue)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${(party.totalDue ?? 0) <= 0 ? 'bg-emerald-50 text-emerald-700' : (party.totalPaid ?? 0) > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                        {(party.totalDue ?? 0) <= 0 ? 'Cleared' : (party.totalPaid ?? 0) > 0 ? 'Partial' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PartyRowActions
                        party={{
                          id: party.id,
                          name: party.name,
                          phone: party.phone ?? '',
                          email: party.email,
                          address: party.address,
                          partyType: party.partyType,
                          taxNumber: party.taxNumber,
                          creditLimit: party.creditLimit?.toString() ?? null,
                          openingBalance: party.openingBalance.toString(),
                          imageUrl: party.imageUrl,
                          isActive: party.isActive
                        }}
                      />
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
          <div className="flex flex-col items-end gap-2">
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
      </div>
    </main>
  );
}
