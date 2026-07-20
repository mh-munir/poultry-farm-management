import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createOrUpdateProduct, getProductCategories } from '@/features/products/actions';

export default async function NewProductPage() {
  await requireUser();
  const categories = await getProductCategories();

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="flex items-center justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">New Product</p>
          <h1 className="mt-2 text-3xl font-semibold">Create a new inventory item</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/products"><ArrowLeft className="mr-2 h-4 w-4" />Back to list</Link>
        </Button>
      </div>

      <form action={createOrUpdateProduct} autoComplete="off" className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Code</label>
            <input name="code" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="FEED-001" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Name</label>
            <input name="name" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="Layer Feed" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <select name="categoryId" className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">Uncategorized</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Type</label>
            <select name="productType" defaultValue="FEED" className="w-full rounded-md border bg-background px-3 py-2">
              <option value="FEED">Feed</option>
              <option value="MEDICINE">Medicine</option>
              <option value="EGG">Egg</option>
              <option value="CHICKEN">Chicken</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Unit</label>
            <input name="unit" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="bag" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Barcode</label>
            <input name="barcode" className="w-full rounded-md border bg-background px-3 py-2" placeholder="8901234567890" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Purchase price</label>
            <input type="number" step="0.01" min="0" name="defaultPurchasePrice" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Selling price</label>
            <input type="number" step="0.01" min="0" name="defaultSellingPrice" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Opening stock</label>
            <input type="number" step="0.01" min="0" name="openingStock" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Low stock threshold</label>
            <input type="number" step="0.01" min="0" name="lowStockThreshold" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Image URL</label>
            <input name="imageUrl" className="w-full rounded-md border bg-background px-3 py-2" placeholder="https://example.com/product.png" />
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
            <label htmlFor="isActive" className="text-sm">Active product</label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit">Create Product</Button>
          <Button asChild variant="outline" type="button"><Link href="/dashboard/products">Cancel</Link></Button>
        </div>
      </form>
    </main>
  );
}
