import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createOrUpdateProduct, getProductCategories } from '@/features/products/actions';
import { prisma } from '@/server/db';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        code: true,
        name: true,
        productType: true,
        unit: true,
        categoryId: true,
        defaultPurchasePrice: true,
        defaultSellingPrice: true,
        barcode: true,
        imageUrl: true,
        lowStockThreshold: true,
        isActive: true,
        stockBalance: { select: { quantityOnHand: true } }
      }
    }),
    getProductCategories()
  ]);

  if (!product) notFound();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Edit Product</p>
          <h1 className="mt-2 text-3xl font-semibold">Update inventory details</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/products"><ArrowLeft className="mr-2 h-4 w-4" />Back to list</Link>
        </Button>
      </div>

      <form action={createOrUpdateProduct} autoComplete="off" className="rounded-2xl border bg-card p-6 shadow-sm">
        <input type="hidden" name="id" value={product.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Code</label>
            <input name="code" required defaultValue={product.code} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Name</label>
            <input name="name" required defaultValue={product.name} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <select name="categoryId" defaultValue={product.categoryId ?? ''} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">Uncategorized</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Type</label>
            <select name="productType" defaultValue={product.productType} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="FEED">Feed</option>
              <option value="MEDICINE">Medicine</option>
              <option value="EGG">Egg</option>
              <option value="CHICKEN">Chicken</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Unit</label>
            <input name="unit" required defaultValue={product.unit} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Barcode</label>
            <input name="barcode" defaultValue={product.barcode ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Purchase price</label>
            <input type="number" step="0.01" min="0" name="defaultPurchasePrice" defaultValue={product.defaultPurchasePrice?.toString() ?? '0'} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Selling price</label>
            <input type="number" step="0.01" min="0" name="defaultSellingPrice" defaultValue={product.defaultSellingPrice?.toString() ?? '0'} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Opening stock</label>
            <input type="number" step="0.01" min="0" name="openingStock" defaultValue={product.stockBalance?.quantityOnHand?.toString() ?? '0'} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Low stock threshold</label>
            <input type="number" step="0.01" min="0" name="lowStockThreshold" defaultValue={product.lowStockThreshold?.toString() ?? '0'} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Image URL</label>
            <input name="imageUrl" defaultValue={product.imageUrl ?? ''} className="w-full rounded-md border bg-background px-3 py-2" placeholder="https://example.com/product.png" />
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked={product.isActive} className="h-4 w-4" />
            <label htmlFor="isActive" className="text-sm">Active product</label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit">Save Changes</Button>
          <Button asChild variant="outline" type="button"><Link href="/dashboard/products">Cancel</Link></Button>
        </div>
      </form>
    </main>
  );
}
