import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createOrUpdateProduct } from '@/features/products/actions';
import { getProductCategories } from '@/features/products/actions';
import { getDictionary } from '@/i18n';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';

export default async function NewProductPage() {
  await requireUser();
  const cookieStore = await cookies();
  const locale = getLocaleFromValue(cookieStore.get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);

  const PRODUCT_TYPES = [
    { value: 'FEED', label: dict.forms.feedType },
    { value: 'MEDICINE', label: dict.forms.medicineType },
    { value: 'EGG', label: dict.forms.eggType },
    { value: 'CHICKEN', label: dict.forms.chickenType },
    { value: 'CHICK', label: dict.forms.chickType }
  ] as const;

  const UNIT_OPTIONS = [
    { value: 'pcs', label: dict.forms.pcs },
    { value: 'bag', label: dict.forms.bag },
    { value: 'kg', label: dict.forms.kg },
    { value: 'gm', label: dict.forms.gm },
    { value: 'bottle', label: dict.forms.bottle },
    { value: 'liter', label: dict.forms.liter },
    { value: 'box', label: dict.forms.box },
    { value: 'pack', label: dict.forms.pack }
  ] as const;
  const categories = await getProductCategories();

  async function createProduct(formData: FormData) {
    'use server';
    await createOrUpdateProduct(formData);
  }

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.common.products}</p>
          <h1 className="mt-2 text-3xl font-semibold">{dict.common.addNewProduct}</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {dict.common.backToDashboard}
          </Link>
        </Button>
      </div>

      <form action={createProduct} className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">{dict.forms.productNameLabel}</label>
            <input name="name" required className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.forms.hatchlingChickExample} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.productCodeLabel}</label>
            <input name="code" required className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.forms.chickenCodeExample} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.productTypeLabel}</label>
            <select name="productType" defaultValue="CHICK" className="w-full form-select">
              {PRODUCT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.unitLabel}</label>
            <select name="unit" defaultValue="pcs" className="w-full form-select">
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit.value} value={unit.value}>{unit.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{dict.common.category}</label>
            <select name="categoryId" className="w-full form-select">
              <option value="">{dict.forms.selectCategoryPlaceholder}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.defaultPurchasePrice}</label>
            <input type="number" step="0.01" min="0" name="defaultPurchasePrice" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.defaultSellingPrice}</label>
            <input type="number" step="0.01" min="0" name="defaultSellingPrice" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.barcode}</label>
            <input name="barcode" className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.forms.optional} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.openingStock}</label>
            <input type="number" step="0.01" min="0" name="openingStock" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.lowStockThreshold}</label>
            <input type="number" step="0.01" min="0" name="lowStockThreshold" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
            <label htmlFor="isActive" className="text-sm">{dict.common.activeProduct}</label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit">{dict.common.create}</Button>
          <Button asChild variant="outline" type="button">
            <Link href="/dashboard/products">{dict.common.cancel}</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
