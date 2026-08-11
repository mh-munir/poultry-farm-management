import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createOrUpdateProduct } from '@/features/products/actions';
import { getProductCategories } from '@/features/products/actions';

const PRODUCT_TYPES = [
  { value: 'FEED', label: 'Feed' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'EGG', label: 'Egg' },
  { value: 'CHICKEN', label: 'Chicken' },
  { value: 'CHICK', label: 'Hatchling / Chick' }
] as const;

const UNIT_OPTIONS = [
  { value: 'pcs', label: 'Pcs' },
  { value: 'bag', label: 'Bag' },
  { value: 'kg', label: 'Kg' },
  { value: 'gm', label: 'Gm' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'liter', label: 'Liter' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' }
] as const;

export default async function NewProductPage() {
  await requireUser();
  const categories = await getProductCategories();

  async function createProduct(formData: FormData) {
    'use server';
    await createOrUpdateProduct(formData);
  }

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Products</p>
          <h1 className="mt-2 text-3xl font-semibold">Add new product</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>

      <form action={createProduct} className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Product Name</label>
            <input name="name" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="Hatchling / Chick" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Product Code</label>
            <input name="code" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="CHICK-001" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Product Type</label>
            <select name="productType" defaultValue="CHICK" className="w-full form-select">
              {PRODUCT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Unit</label>
            <select name="unit" defaultValue="pcs" className="w-full form-select">
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit.value} value={unit.value}>{unit.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <select name="categoryId" className="w-full form-select">
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Default Purchase Price</label>
            <input type="number" step="0.01" min="0" name="defaultPurchasePrice" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Default Selling Price</label>
            <input type="number" step="0.01" min="0" name="defaultSellingPrice" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Barcode</label>
            <input name="barcode" className="w-full rounded-md border bg-background px-3 py-2" placeholder="Optional" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Opening Stock</label>
            <input type="number" step="0.01" min="0" name="openingStock" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Low Stock Threshold</label>
            <input type="number" step="0.01" min="0" name="lowStockThreshold" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
            <label htmlFor="isActive" className="text-sm">Active product</label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit">Create Product</Button>
          <Button asChild variant="outline" type="button">
            <Link href="/dashboard/products">Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
