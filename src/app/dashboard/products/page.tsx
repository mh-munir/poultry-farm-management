import Link from 'next/link';
import { Package2, Plus } from 'lucide-react';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getProductTypeLabel, getProductTypeBadgeClass } from '@/lib/product-types';
import { Pagination } from '@/components/ui/pagination';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { getProductPageData, getProductStats, getProductCategories } from '@/features/products/actions';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { getDictionary } from '@/i18n';

const PRODUCT_TYPES = ['ALL', 'FEED', 'MEDICINE', 'EGG', 'CHICKEN', 'CHICK'] as const;

function formatCurrency(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `৳ ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)}`;
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    categoryId?: string;
    productType?: string;
    error?: string;
    success?: string;
  }>;
}) {
  await requireUser();

  const cookiesStore = await cookies();
  const locale = getLocaleFromValue(cookiesStore.get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);
  const successCookie = cookiesStore.get('productSuccess');
  const success = successCookie?.value ?? '';

  const params = await searchParams;
  const page = Number(params?.page ?? '1');
  const search = params?.search ?? '';
  const categoryId = params?.categoryId ?? 'ALL';
  const productType = params?.productType ?? 'ALL';
  const error = params?.error ?? '';

  const buildPaginationHref = (pageNumber: number) => {
    const query = new URLSearchParams({
      ...(search ? { search } : {}),
      ...(categoryId && categoryId !== 'ALL' ? { categoryId } : {}),
      ...(productType && productType !== 'ALL' ? { productType } : {})
    });
    query.set('page', String(pageNumber));
    return `/dashboard/products?${query.toString()}`;
  };

  const [data, stats, categories] = await Promise.all([
    getProductPageData({ page, search, categoryId, productType }),
    getProductStats(),
    getProductCategories()
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.common.products}</p>
          <h1 className="mt-2 text-3xl font-semibold">{dict.common.manageProducts}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {dict.common.productIntro}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/dashboard">
            ← {dict.common.backToDashboard}
          </Link>
        </Button>
      </div>

      {(error || success) && (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {error || success}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-background p-4">
          <p className="text-sm text-muted-foreground">{dict.common.totalProducts}</p>
          <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-sm text-muted-foreground">{dict.common.activeProducts}</p>
          <p className="mt-2 text-2xl font-semibold">{stats.active}</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-sm text-muted-foreground">{dict.common.lowStock}</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{stats.lowStock}</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-sm text-muted-foreground">{dict.common.categories}</p>
          <p className="mt-2 text-2xl font-semibold">{categories.length}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">{dict.common.products}</h2>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/dashboard/products/new">
                <Plus className="mr-2 h-4 w-4" />
                {dict.stock.addProduct}
              </Link>
            </Button>
          </div>
          <form method="get" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder={dict.common.searchPlaceholder}
                className="h-[42px] min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
              <select
                name="categoryId"
                defaultValue={categoryId}
                className="form-select min-w-0 w-full"
              >
                <option value="ALL">{dict.common.allCategories}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <select
                name="productType"
                defaultValue={productType}
                className="form-select min-w-0 w-full"
              >
                {PRODUCT_TYPES.map((type) => (
                  <option key={type} value={type}>{type === 'ALL' ? dict.common.allTypes : getProductTypeLabel(type)}</option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">{dict.common.filter}</Button>
          </form>
        </div>

        <div className="overflow-visible rounded-xl border">
          <ResponsiveTable stickyLastColumn minWidth="900px">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{dict.common.code}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.productName}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.category}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.type}</th>
                  <th className="px-4 py-3 font-medium text-right">{dict.common.purchasePrice}</th>
                  <th className="px-4 py-3 font-medium text-right">{dict.common.salePrice}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.stock}</th>
                  <th className="px-4 py-3 font-medium">{dict.common.status}</th>
                  <th className="px-4 py-3 text-right font-medium">{dict.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {data.products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                      {dict.common.noProductsFound}
                    </td>
                  </tr>
                ) : (
                  data.products.map((product) => (
                    <tr key={product.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{product.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {categoryMap.get(product.categoryId ?? 0) ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getProductTypeBadgeClass(product.productType)}`}>
                          {getProductTypeLabel(product.productType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(product.defaultPurchasePrice))}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(product.defaultSellingPrice))}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {Number(product.stockBalance?.quantityOnHand ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {product.isActive ? dict.common.activeStatus : dict.common.inactiveStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                            <Link href={`/dashboard/products/${product.id}/edit`}>
                              {dict.common.edit}
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>

        {data.total > 10 && (
          <div className="flex items-center justify-end">
            <Pagination currentPage={page} totalPages={data.totalPages} hrefBuilder={buildPaginationHref} />
          </div>
        )}
      </div>
    </main>
  );
}
