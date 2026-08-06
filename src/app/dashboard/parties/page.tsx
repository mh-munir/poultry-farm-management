import Link from 'next/link';
import { Receipt, Users, Package2 } from 'lucide-react';
import type { Decimal } from '@prisma/client/runtime/library';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { StatCard } from '@/components/dashboard/stat-card';
import { AddPartyDialog } from '@/app/dashboard/parties/add-party-dialog';
import { PartyToast } from './party-toast';
import { PartySearchForm } from './search-form';
import { PartyRowActions } from './party-row-actions';
import { getPartyNames, getPartyPageData, getPartyStats } from '@/features/parties/actions';
import type { ProductOption } from '@/app/dashboard/parties/add-party-dialog';
import { getProductsForSales } from '@/features/sales/actions';

const PARTY_TYPES = ['ALL', 'CUSTOMER', 'PARTY', 'BOTH'] as const;
const PARTY_STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE'] as const;

type PartySummary = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  partyType: string;
  taxNumber?: string | null;
  creditLimit?: Decimal | number | string | null;
  openingBalance?: Decimal | number | string | null;
  imageUrl?: string | null;
  isActive?: boolean | null;
  lastTransactionDate?: Date | null;
  supplierInvoiced?: Decimal | number | string | null;
  customerInvoiced?: Decimal | number | string | null;
  totalPaid?: Decimal | number | string | null;
  totalDue?: Decimal | number | string | null;
};

type PartyProduct = {
  id: number;
  name: string;
  code: string;
  productType: string;
  unit: string | null;
  defaultSellingPrice: Decimal | number | string | null;
  defaultPurchasePrice: Decimal | number | string | null;
  stockBalance?: { quantityOnHand: Decimal | number | string | null } | null;
  stockMovements?: Array<{ unitCost: Decimal | number | string | null }> | null;
};

function formatCurrency(value: number | string | Decimal | null | undefined) {
  const number = Number(value ?? 0);
  return `৳ ${number.toFixed(2)}`;
}

function formatPartyType(type: string) {
  if (type === 'CUSTOMER') return 'Customer';
  if (type === 'PARTY') return 'Supplier';
  if (type === 'BOTH') return 'Both';
  return type.replace('_', ' ');
}

function formatLastTransactionDate(date: Date | null | undefined) {
  if (!date) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateDay.getTime() === today.getTime()) {
    return `Today • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  if (dateDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function PartiesPage({
  searchParams
}: {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    partyType?: string;
    status?: string;
    error?: string;
    success?: string;
  }>;
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

  const productOptions: ProductOption[] = (products as PartyProduct[]).map((product: PartyProduct) => ({
    id: product.id,
    name: product.name,
    code: product.code,
    productType: product.productType,
    unit: product.unit ?? 'pcs',
    defaultSellingPrice: Number(product.defaultSellingPrice ?? 0),
    defaultPurchasePrice: Number(product.stockMovements?.[0]?.unitCost ?? product.defaultPurchasePrice ?? 0),
    stockQuantity: Number(product.stockBalance?.quantityOnHand ?? 0)
  }));

  const parties = data.parties as PartySummary[];
  const totalPurchase = parties.reduce<number>((sum: number, p: PartySummary) => sum + Number(p.supplierInvoiced ?? 0), 0);
  const totalSales = parties.reduce<number>((sum: number, p: PartySummary) => sum + Number(p.customerInvoiced ?? 0), 0);
  const totalPaid = parties.reduce<number>((sum: number, p: PartySummary) => sum + Number(p.totalPaid ?? 0), 0);
  const totalDue = parties.reduce<number>((sum: number, p: PartySummary) => sum + Number(p.totalDue ?? 0), 0);

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="mb-6">
        <h1 className="mt-2 text-3xl font-semibold">Manage customers and parties</h1>
      </div>

      {/* Parties Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm mb-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 flex-1">
          <StatCard title="Total Parties" value={stats.total} icon={Users} accent="bg-indigo-50 text-indigo-600" />
          <StatCard title="Active Parties" value={stats.active} icon={Package2} accent="bg-emerald-50 text-emerald-600" />
          <StatCard title="Customers" value={stats.customers} icon={Receipt} accent="bg-sky-50 text-sky-600" />
          <StatCard title="Party Suppliers" value={stats.suppliers} icon={Receipt} accent="bg-amber-50 text-amber-600" />
        </div>
      </div>

      {/* Parties Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-2 sm:mb-6 justify-between">
        <AddPartyDialog partyOptions={partyOptions} productOptions={productOptions} />
        <PartySearchForm
          search={search}
          partyType={partyType}
          status={status}
        />
      </div>

      <PartyToast success={success} error={error} />

      {/* Parties Table */}
      <div className="overflow-visible rounded-2xl border-0 sm:border bg-card shadow-sm">
        <div className="border-1 sm:border-b px-4 py-4 bg-muted/20">
          <h2 className="text-lg font-semibold">Parties</h2>
        </div>
        <ResponsiveTable stickyLastColumn minWidth="980px">
          <table className="min-w-full text-sm">
             <thead className="bg-muted/40 text-left">
               <tr>
                 <th className="px-4 py-3 font-medium">Party Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Purchase</th>
                 <th className="px-4 py-3 font-medium">Sales</th>
                 <th className="px-4 py-3 font-medium">Paid</th>
                 <th className="px-4 py-3 font-medium">Due</th>
                 <th className="px-4 py-3 font-medium">Balance</th>
                 <th className="px-4 py-3 text-right font-medium">Action</th>
               </tr>
             </thead>
             <tbody>
               {parties.length === 0 ? (
                 <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                     No parties found. Create your first party to get started.
                   </td>
                 </tr>
               ) : (
                 parties.map((party: PartySummary) => (
                   <tr key={party.id} className="border-t">
                     <td className="px-4 py-3">
                       <div className="flex flex-col">
                         <Link
                           href={`/dashboard/parties/${party.id}`}
                           className="font-medium text-primary hover:underline"
                         >
                           {party.name}
                         </Link>
                         {party.lastTransactionDate && (
                           <span className="text-xs text-muted-foreground">
                             Last Deal: {formatLastTransactionDate(party.lastTransactionDate)}
                           </span>
                         )}
                       </div>
                     </td>
                     <td className="px-4 py-3">
                       <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                         party.partyType === 'CUSTOMER' ? 'bg-sky-100 text-sky-800' :
                         party.partyType === 'PARTY' ? 'bg-amber-100 text-amber-800' :
                         'bg-purple-100 text-purple-800'
                       }`}>
                         {formatPartyType(party.partyType)}
                       </span>
                     </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(party.supplierInvoiced ?? 0)}</td>
                     <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(party.customerInvoiced ?? 0)}</td>
                     <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(party.totalPaid ?? 0)}</td>
                     <td className="px-4 py-3">{formatCurrency(party.totalDue)}</td>
                     <td className="px-4 py-3">
                       {party.partyType === 'CUSTOMER' || party.partyType === 'BOTH' ? (
                         <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${Number(party.openingBalance ?? 0) > 0 ? 'bg-rose-100 text-rose-700' : Number(party.openingBalance ?? 0) < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                           {Number(party.openingBalance ?? 0) > 0 ? '🔴 Due' : Number(party.openingBalance ?? 0) < 0 ? '🟢 Advance' : '⚪ Clear'}
                           <span className="ml-2 font-semibold">{formatCurrency(Math.abs(Number(party.openingBalance ?? 0)))}</span>
                         </span>
                       ) : (
                         <span className="text-xs text-muted-foreground">—</span>
                       )}
                     </td>
                     <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                         <Link
                           href={`/dashboard/parties/${party.id}/print`}
                           target="_blank"
                           className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-muted/80"
                         >
                           🖨 Print
                         </Link>
                         <PartyRowActions
                           party={{
                             id: party.id,
                             name: party.name,
                             phone: party.phone ?? '',
                             email: party.email ?? null,
                             address: party.address ?? null,
                             partyType: party.partyType,
                             taxNumber: party.taxNumber ?? null,
                             creditLimit: party.creditLimit?.toString() ?? null,
                             openingBalance: String(party.openingBalance ?? 0),
                             imageUrl: party.imageUrl ?? null,
                             isActive: party.isActive ?? true
                           }}
                         />
                       </div>
                     </td>
                   </tr>
                 ))
               )}
              </tbody>
              {parties.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-muted/40 font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-sm">TOTAL</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(totalPurchase)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(totalSales)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(totalPaid)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(totalDue)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">—</td>
                  </tr>
                </tfoot>
              )}
           </table>
        </ResponsiveTable>

        <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {parties.length} of {data.total} parties
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
