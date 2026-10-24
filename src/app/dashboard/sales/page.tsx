import Link from 'next/link';
import { cookies } from 'next/headers';
import { Plus, ArrowLeft, ClipboardList, Package2, Printer } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getDictionary } from '@/i18n';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';

type SerializableDecimal = number | string | { toString(): string } | null | undefined;

function normalizeSerializableDecimal(value: SerializableDecimal): number {
  if (value == null || value === '') return 0;

  const numericValue = typeof value === 'object' ? value.toString() : String(value);
  const parsed = Number(numericValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

import { Pagination } from '@/components/ui/pagination';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { getCustomersForSales, getProductsForSales, getSalesPageData } from '@/features/sales/actions';
import { SaleForm } from './sale-form';
import { getProductTypeLabel, getProductTypeBadgeClass } from '@/lib/product-types';
import { formatLocalizedCurrency, formatLocalizedNumber } from '@/lib/localized-formatters';

function getFormatters(locale: 'en' | 'bn') {
  return {
    formatCurrency: (value: SerializableDecimal) =>
      formatLocalizedCurrency(value, locale),
    formatNumber: (value: SerializableDecimal) =>
      formatLocalizedNumber(normalizeSerializableDecimal(value), locale),
  };
}

function formatStock(value: SerializableDecimal) {
  return `${normalizeSerializableDecimal(value).toFixed(2)}`;
}

export default async function SalesPage({
  searchParams
}: {
  searchParams?: Promise<{ page?: string; search?: string; error?: string; success?: string }>;
}) {
  await requireUser();

  const cookieStore = await cookies();
  const locale = getLocaleFromValue(cookieStore.get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);
  const { formatCurrency } = getFormatters(locale);

  const params = await searchParams;
  const page = Number(params?.page ?? '1');
  const search = params?.search ?? '';
  const error = params?.error ?? '';
  const success = params?.success ?? '';

  const buildPaginationHref = (pageNumber: number) => {
    const query = new URLSearchParams({
      ...(search ? { search } : {})
    });
    query.set('page', String(pageNumber));
    return `/dashboard/sales?${query.toString()}`;
  };

  const [data, products, customers] = await Promise.all([
    getSalesPageData({ page, search }),
    getProductsForSales(),
    getCustomersForSales()
  ]);
  const saleProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    code: product.code,
    unit: product.unit,
    defaultSellingPrice: Number(product.defaultSellingPrice ?? 0),
    defaultPurchasePrice: Number(product.stockMovements?.[0]?.unitCost ?? product.defaultPurchasePrice ?? 0),
    stockQuantity: Number(product.stockBalance?.quantityOnHand ?? 0)
  }));

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.common.sales}</p>
          <h1 className="mt-2 text-3xl font-semibold">{dict.pages.salesMainSection}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {dict.pages.recentSales}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />{dict.common.backToDashboard}</Link>
        </Button>
      </div>

      {(error || success) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {error || success}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[1.3fr_0.7fr]">
        <div className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><ClipboardList className="h-5 w-5" />{dict.pages.newSale}</div>
          <SaleForm customers={customers} products={saleProducts} />
        </div>

        <div className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5" />{dict.pages.recentSales}</div>
          <div className="space-y-3">
            {data.sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dict.common.noData}</p>
            ) : (
              data.sales.map((sale) => (
                <div key={sale.id} className="rounded-lg border bg-background p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{sale.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">{sale.party?.name ?? 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{dict.forms.mediaName}: {sale.mediaName || '—'}</div>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <div className="text-right text-sm">
                        <div>{formatCurrency(normalizeSerializableDecimal(sale.totalAmount))}</div>
                        <div className="text-xs text-muted-foreground">{dict.common.due} {formatCurrency(normalizeSerializableDecimal(sale.dueAmount))}</div>
                      </div>
                      <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                        <Link href={`/dashboard/transactions/${sale.id}/print`} target="_blank" rel="noreferrer">
                          <Printer className="mr-2 h-4 w-4" />
                          {dict.common.print}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Pagination currentPage={page} totalPages={data.totalPages} hrefBuilder={buildPaginationHref} />
          </div>
        </div>
      </div>

      {/* Available Products for Sale/Purchase */}
      <div className="mt-8 rounded-2xl border bg-card p-5 shadow-sm overflow-x-auto">
        <div className="mb-6 flex items-center gap-2">
          <Package2 className="h-6 w-6" />
          <h2 className="text-xl font-semibold">{dict.pages.availableProductsInventory}</h2>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
            <Package2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">{dict.pages.noProductsAvailableYet}</p>
            <p className="mt-1 text-xs text-muted-foreground">{dict.pages.createProductsFirst}</p>
            <Button asChild className="mt-4 w-full sm:w-auto">
              <Link href={'/dashboard/products/new' as any}>{dict.common.create}</Link>
            </Button>
          </div>
        ) : (
          <ResponsiveTable minWidth="840px">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{dict.common.productName}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.code}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.type}</th>
                  <th className="px-4 py-3 font-medium">{dict.stock.stockType}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.salePrice}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.purchasePrice}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stock = Number(product.stockBalance?.quantityOnHand ?? 0);
                  const stockClass = stock > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
                  
                  return (
                    <tr key={product.id} className="border-t hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{product.code}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getProductTypeBadgeClass(product.productType)}`}>
                          {getProductTypeLabel(product.productType)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${stockClass}`}>
                        {formatStock(stock)}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(normalizeSerializableDecimal(product.defaultSellingPrice))}</td>
                      <td className="px-4 py-3">{formatCurrency(normalizeSerializableDecimal(product.defaultPurchasePrice))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </div>
    </main>
  );
}
