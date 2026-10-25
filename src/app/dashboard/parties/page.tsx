import Link from 'next/link';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/i18n';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';

type SerializableDecimal = number | string | { toString(): string } | null;
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Pagination } from '@/components/ui/pagination';
import { PartiesOverview } from '@/components/dashboard/parties-overview';
import { AddPartyDialog } from '@/app/dashboard/parties/add-party-dialog';
import { PartyToast } from './party-toast';
import { PartySearchForm } from './search-form';
import { PartyRowActions } from './party-row-actions';
import { getPartyNames, getPartyPageData, getPartyStats } from '@/features/parties/actions';
import type { ProductOption } from '@/app/dashboard/parties/add-party-dialog';
import { getProductsForSales } from '@/features/sales/actions';
import { formatDateBD, formatDateTimeBD } from '@/lib/dates';
import { UsersRound } from 'lucide-react';

type PartySummary = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  partyType: string;
  taxNumber?: string | null;
  creditLimit?: SerializableDecimal;
  openingBalance?: SerializableDecimal;
  imageUrl?: string | null;
  isActive?: boolean | null;
  lastTransactionDate?: Date | null;
  supplierInvoiced?: SerializableDecimal;
  customerInvoiced?: SerializableDecimal;
  totalPaid?: SerializableDecimal;
  totalDue?: SerializableDecimal;
};

type PartyProduct = {
  id: number;
  name: string;
  code: string;
  productType: string;
  unit: string | null;
  defaultSellingPrice: SerializableDecimal;
  defaultPurchasePrice: SerializableDecimal;
  stockBalance?: { quantityOnHand?: SerializableDecimal } | null;
  stockMovements?: Array<{ unitCost: SerializableDecimal }> | null;
};

function formatCurrency(value: number | string | SerializableDecimal | null | undefined) {
  const number = Number(value ?? 0);
  return `৳ ${number.toFixed(2)}`;
}

function formatPartyType(type: string, dict: ReturnType<typeof getDictionary>) {
  if (type === 'CUSTOMER') return dict.common.customer;
  if (type === 'PARTY') return dict.common.supplier;
  if (type === 'BOTH') return dict.common.both;
  return type.replace('_', ' ');
}

function formatLastTransactionDate(date: Date | null | undefined, dict: ReturnType<typeof getDictionary>) {
  if (!date) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateDay.getTime() === today.getTime()) {
    return `${dict.common.today} • ${formatDateTimeBD(date)}`;
  }
  if (dateDay.getTime() === yesterday.getTime()) {
    return dict.common.yesterday;
  }
  return formatDateBD(date);
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
    overviewPeriod?: string;
  }>;
}) {
  await requireUser();

  const cookiesStore = await cookies();
  const locale = getLocaleFromValue(cookiesStore.get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);
  const partySuccessCookie = cookiesStore.get('partySuccess');
  const success = partySuccessCookie?.value ?? '';

  const params = await searchParams;
  const page = Number(params?.page ?? '1');
  const search = params?.search ?? '';
  const partyType = params?.partyType ?? 'ALL';
  const status = params?.status ?? 'ALL';
  const error = params?.error ?? '';
  const overviewPeriod = params?.overviewPeriod === 'month' ? 'month' : 'all';

  const buildPaginationHref = (pageNumber: number) => {
    const query = new URLSearchParams({
      ...(search ? { search } : {}),
      ...(partyType && partyType !== 'ALL' ? { partyType } : {}),
      ...(status && status !== 'ALL' ? { status } : {})
    });
    query.set('page', String(pageNumber));
    return `/dashboard/parties?${query.toString()}`;
  };

  const [data, stats, partyOptions, products] = await Promise.all([
    getPartyPageData({ page, search, partyType, status }),
    getPartyStats({ search, partyType, status, period: overviewPeriod }),
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
      <PartiesOverview stats={stats} period={overviewPeriod} />

      <PartyToast success={success} error={error} />

      <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 xl:flex-row xl:items-center xl:gap-5">
        <div className="flex shrink-0 items-center gap-3 xl:border-r xl:border-slate-200 xl:pr-5 dark:xl:border-slate-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <UsersRound className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{dict.nav.parties}</h1>
        </div>
        <AddPartyDialog partyOptions={partyOptions} productOptions={productOptions} />
        <PartySearchForm
          search={search}
          partyType={partyType}
          status={status}
        />
      </header>

      {/* Parties Table */}
      <div className="overflow-visible rounded-2xl border-0 sm:border bg-card shadow-sm">
        <div className="border-b px-4 py-4 bg-muted/20">
          <h2 className="text-lg font-semibold">{dict.nav.parties}</h2>
        </div>
        <ResponsiveTable stickyLastColumn minWidth="980px">
          <table className="min-w-full text-sm">
             <thead className="bg-muted/40 text-left">
               <tr>
                 <th className="px-4 py-3 font-medium">{dict.common.partyName}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.partyType}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.purchases}</th>
                 <th className="px-4 py-3 font-medium">{dict.common.sales}</th>
                 <th className="px-4 py-3 font-medium">{dict.common.paid}</th>
                 <th className="px-4 py-3 font-medium">{dict.common.due}</th>
                 <th className="px-4 py-3 font-medium">{dict.common.balance}</th>
                 <th className="px-4 py-3 text-right font-medium">{dict.common.actions}</th>
               </tr>
             </thead>
             <tbody>
               {parties.length === 0 ? (
                 <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                     {dict.common.noPartiesFound}
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
                             {dict.common.lastDeal}: {formatLastTransactionDate(party.lastTransactionDate, dict)}
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
                         {formatPartyType(party.partyType, dict)}
                       </span>
                     </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(party.supplierInvoiced ?? 0)}</td>
                     <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(party.customerInvoiced ?? 0)}</td>
                     <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(party.totalPaid ?? 0)}</td>
                     <td className="px-4 py-3">{formatCurrency(party.totalDue)}</td>
                     <td className="px-4 py-3">
                       {party.partyType === 'CUSTOMER' || party.partyType === 'BOTH' ? (
                         <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${Number(party.openingBalance ?? 0) > 0 ? 'bg-rose-100 text-rose-700' : Number(party.openingBalance ?? 0) < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                           {Number(party.openingBalance ?? 0) > 0 ? '🔴 ' + dict.common.due : Number(party.openingBalance ?? 0) < 0 ? '🟢 ' + dict.common.advance : '⚪ ' + dict.common.clear}
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
                           🖨 {dict.common.printLabel}
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

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-gradient-to-r from-background to-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Showing</span>
            <span className="font-semibold text-foreground">{parties.length}</span>
            <span className="text-muted-foreground">of</span>
            <span className="font-semibold text-foreground">{data.total}</span>
            <span className="text-muted-foreground">parties</span>
          </div>
          <Pagination currentPage={page} totalPages={data.totalPages} hrefBuilder={buildPaginationHref} className="justify-center sm:justify-end" />
        </div>
      </div>
    </main>
  );
}
