'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createProductForStock } from '@/features/stock/actions';
import { useToast } from '@/hooks/use-toast';

type AddProductModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType: 'FEED' | 'MEDICINE';
  onSuccess?: (product: { id: number; name: string }) => void;
};

export function AddProductModal({ open, onOpenChange, productType, onSuccess }: AddProductModalProps) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { success: showSuccess } = useToast();

  function reset() {
    setName('');
    setUnit('');
    setCode('');
    setError('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.set('name', name);
    formData.set('productType', productType);
    formData.set('unit', unit);
    formData.set('code', code);

    const result = await createProductForStock(formData);

    if (result.success && result.product) {
      showSuccess(result.message);
      onSuccess?.(result.product);
      reset();
      onOpenChange(false);
    } else {
      setError(result.message);
    }

    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
        }
        onOpenChange(next);
      }}
      title={`Add ${productType === 'FEED' ? 'Feed' : 'Medicine'} Product`}
      footer={
        <div className="flex flex-wrap gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="add-product-form" disabled={loading} className={loading ? 'opacity-75 cursor-not-allowed' : ''}>
            {loading ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      }
    >
      <form id="add-product-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="sm:col-span-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
            <p className="text-base font-semibold text-rose-900">Error</p>
            <p className="mt-1 text-sm text-rose-800">{error}</p>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">Product Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
            placeholder={productType === 'FEED' ? 'Layer Feed' : 'Amoxicillin'}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Code (optional)</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
            placeholder={`${productType === 'FEED' ? 'FEED' : 'MED'}-001`}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Unit</label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
            placeholder={productType === 'FEED' ? 'bag' : 'gm'}
            required
          />
        </div>

        <input type="hidden" name="productType" value={productType} />
      </form>
    </Dialog>
  );
}
