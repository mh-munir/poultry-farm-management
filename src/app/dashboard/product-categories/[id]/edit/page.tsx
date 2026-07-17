import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createOrUpdateCategory } from '@/features/product-categories/actions';
import { prisma } from '@/server/db';

export default async function EditProductCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const category = await prisma.productCategory.findUnique({
    where: { id: Number(id) },
    select: { id: true, name: true, slug: true, description: true, isActive: true }
  });

  if (!category) notFound();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Edit Category</p>
          <h1 className="mt-2 text-3xl font-semibold">Update a product category</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/product-categories">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>

      <form action={createOrUpdateCategory} className="rounded-2xl border bg-card p-6 shadow-sm">
        <input type="hidden" name="id" value={category.id} />
        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Name</label>
            <input name="name" required defaultValue={category.name} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Slug</label>
            <input name="slug" required defaultValue={category.slug} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea name="description" rows={3} defaultValue={category.description ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked={category.isActive} className="h-4 w-4" />
            <label htmlFor="isActive" className="text-sm">Active category</label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit">Save Changes</Button>
          <Button asChild variant="outline" type="button">
            <Link href="/dashboard/product-categories">Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
