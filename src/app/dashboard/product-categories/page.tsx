import Link from 'next/link';
import { Plus, Search, ArrowLeft, Boxes, CheckCircle2 } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getCategoryPageData, getCategoryStats } from '@/features/product-categories/actions';

export default async function ProductCategoriesPage({
  searchParams
}: {
  searchParams?: Promise<{ page?: string; search?: string; error?: string; success?: string }>;
}) {
  await requireUser();

  const params = await searchParams;
  const page = Number(params?.page ?? '1');
  const search = params?.search ?? '';
  const error = params?.error ?? '';
  const success = params?.success ?? '';

  const [data, stats] = await Promise.all([getCategoryPageData({ page, search }), getCategoryStats()]);

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Product Categories</p>
          <h1 className="mt-2 text-3xl font-semibold">Organize products by category</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create, edit, search, and paginate product categories such as feed and medicine.
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
            <Link href="/dashboard/product-categories/new">
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Boxes className="h-4 w-4" /> Total Categories
          </div>
          <div className="mt-3 text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" /> Active Categories
          </div>
          <div className="mt-3 text-2xl font-semibold">{stats.active}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <form autoComplete="off" className="flex flex-col gap-3 md:flex-row md:items-end" method="get">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">Search</label>
            <div className="flex items-center rounded-md border bg-background px-3">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <input name="search" defaultValue={search} placeholder="Search by name, slug, or description" className="w-full bg-transparent px-2 py-2 text-sm outline-none" />
            </div>
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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No categories found. Create your first category to get started.
                  </td>
                </tr>
              ) : (
                data.categories.map((category) => (
                  <tr key={category.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{category.name}</td>
                    <td className="px-4 py-3">{category.slug}</td>
                    <td className="px-4 py-3 text-muted-foreground">{category.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${category.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/product-categories/${category.id}/edit`}>Edit</Link>
                        </Button>
                        <form action="/dashboard/product-categories/delete" method="post">
                          <input type="hidden" name="categoryId" value={category.id} />
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
          <p className="text-sm text-muted-foreground">Showing {data.categories.length} of {data.total} categories</p>
          <div className="flex items-center gap-2">
            {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((pageNumber) => {
              const params = new URLSearchParams(search ? { search } : {});
              params.set('page', String(pageNumber));

              return (
                <Link key={pageNumber} href={`/dashboard/product-categories?${params.toString()}`} className={`rounded-md px-3 py-2 text-sm ${page === pageNumber ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}>
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
