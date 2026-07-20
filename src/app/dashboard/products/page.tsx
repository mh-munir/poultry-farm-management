import Link from 'next/link';
import { Plus, Search, Filter, Package2, ArrowLeft, Barcode, Boxes, AlertTriangle } from 'lucide-react';
import type { Decimal } from '@prisma/client/runtime/library';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getProductCategories, getProductPageData, getProductStats } from '@/features/products/actions';

const PRODUCT_TYPES = ['ALL', 'FEED', 'MEDICINE', 'EGG', 'CHICKEN'] as const;

function formatCurrency(value: number | string | Decimal | null | undefined) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(number);
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams?: Promise<{ page?: string; search?: string; categoryId?: string; productType?: string; error?: string; success?: string }>;
}) {
  await requireUser();

  const params = await searchParams;
  const page = Number(params?.page ?? '1');
  const search = params?.search ?? '';
  const categoryId = params?.categoryId ?? 'ALL';
  const productType = params?.productType ?? 'ALL';
  const error = params?.error ?? '';
  const success = params?.success ?? '';

  const [data, stats, categories] = await Promise.all([getProductPageData({ page, search, categoryId, productType }), getProductStats(), getProductCategories()]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Products</p>
          <h1 className="mt-2 text-3xl font-semibold">Manage your inventory items</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create products with category assignment, pricing, barcode, stock thresholds, and a polished inventory UI.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/products/new">
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Package2 className="h-4 w-4" /> Total Products</div>
          <div className="mt-3 text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Boxes className="h-4 w-4" /> Active Products</div>
          <div className="mt-3 text-2xl font-semibold">{stats.active}</div>
        </div>
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" /> Low Stock</div>
          <div className="mt-3 text-2xl font-semibold">{stats.lowStock}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <form autoComplete="off" className="flex flex-col gap-3 lg:flex-row lg:items-end" method="get">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">Search</label>
            <div className="flex items-center rounded-md border bg-background px-3">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <input name="search" defaultValue={search} placeholder="Search by code, name, or barcode" className="w-full bg-transparent px-2 py-2 text-sm outline-none" />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <label className="mb-2 block text-sm font-medium">Category</label>
            <div className="flex items-center rounded-md border bg-background px-3">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <select name="categoryId" defaultValue={categoryId} className="w-full bg-transparent px-2 py-2 text-sm outline-none">
                <option value="ALL">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="w-full lg:w-48">
            <label className="mb-2 block text-sm font-medium">Type</label>
            <select name="productType" defaultValue={productType} className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none">
              {PRODUCT_TYPES.map((type) => (
                <option key={type} value={type}>{type === 'ALL' ? 'All Types' : type}</option>
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
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.products.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No products found. Create your first product to get started.</td></tr>
              ) : (
                data.products.map((product) => {
                  const stock = Number(product.stockBalance?.quantityOnHand ?? 0);
                  const lowStock = stock <= Number(product.stockBalance?.reservedQuantity ?? 0) || stock <= 0;

                  return (
                    <tr key={product.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Barcode className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-muted-foreground">{product.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{product.category?.name ?? 'Uncategorized'}</td>
                      <td className="px-4 py-3">
                        <div>{formatCurrency(product.defaultSellingPrice)}</div>
                        <div className="text-xs text-muted-foreground">Cost {formatCurrency(product.defaultPurchasePrice)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{stock}</div>
                        <div className="text-xs text-muted-foreground">{product.unit}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${lowStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {lowStock ? 'Low stock' : 'In stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/products/${product.id}/edit`}>Edit</Link>
                          </Button>
                          <form action="/dashboard/products/delete" method="post">
                            <input type="hidden" name="productId" value={product.id} />
                            <Button variant="destructive" size="sm" type="submit">Delete</Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Showing {data.products.length} of {data.total} products</p>
          <div className="flex items-center gap-2">
            {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((pageNumber) => {
              const params = new URLSearchParams({ ...(search ? { search } : {}), ...(categoryId && categoryId !== 'ALL' ? { categoryId } : {}), ...(productType && productType !== 'ALL' ? { productType } : {}) });
              params.set('page', String(pageNumber));

              return <Link key={pageNumber} href={`/dashboard/products?${params.toString()}`} className={`rounded-md px-3 py-2 text-sm ${page === pageNumber ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}>{pageNumber}</Link>;
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
