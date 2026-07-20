'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createStockMovement } from '@/features/stock/actions';

type StockProduct = {
  id: number;
  name: string;
  code: string;
  unit: string;
  productType: string;
};

type StockEntryDialogProps = {
  products: StockProduct[];
  initialMode?: 'medicine' | 'feed';
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
};

export function StockEntryDialog({
  products,
  initialMode = 'medicine',
  triggerLabel = 'Add Stock',
  triggerVariant = 'default'
}: StockEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'medicine' | 'feed'>(initialMode);

  const filteredProducts = products.filter((product) => {
    const productType = product.productType?.toUpperCase();
    if (mode === 'medicine') {
      return productType === 'MEDICINE';
    }
    return productType === 'FEED';
  });

  return (
    <>
      <Button type="button" variant={triggerVariant} onClick={() => setOpen(true)} className="w-full justify-center sm:w-auto">
        <Plus className="mr-2 h-4 w-4" />{triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen} title={mode === 'medicine' ? 'Add Medicine Stock' : 'Add Feed Stock'}>
        <div className="flex gap-2 rounded-lg border bg-muted/40 p-2">
          <button
            type="button"
            onClick={() => setMode('medicine')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === 'medicine' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            Medicine
          </button>
          <button
            type="button"
            onClick={() => setMode('feed')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === 'feed' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            Feed
          </button>
        </div>

        <form action={createStockMovement} autoComplete="off" className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Product</label>
            <select name="productId" required className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">Select a product</option>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.code})
                  </option>
                ))
              ) : (
                <option value="" disabled>No {mode === 'medicine' ? 'medicine' : 'feed'} products available</option>
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Movement type</label>
            <select name="movementType" defaultValue="PURCHASE" required className="w-full rounded-md border bg-background px-3 py-2">
              <option value="PURCHASE">Stock In</option>
              <option value="SALE">Stock Out</option>
              <option value="ADJUSTMENT">Stock Adjustment</option>
              <option value="RETURN">Return</option>
              <option value="WASTAGE">Wastage</option>
              <option value="PRODUCTION">Production</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Adjustment direction</label>
            <select name="adjustmentMode" defaultValue="INCREASE" className="w-full rounded-md border bg-background px-3 py-2">
              <option value="INCREASE">Increase stock</option>
              <option value="DECREASE">Decrease stock</option>
            </select>
            <p className="mt-2 text-xs text-muted-foreground">Use this only for stock adjustments; it is ignored for stock in/out entries.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Quantity</label>
            <input type="number" step="0.01" min="0.01" required name="quantity" defaultValue="1" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Unit cost</label>
            <input type="number" step="0.01" min="0" required name="unitCost" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Notes</label>
            <textarea name="notes" rows={3} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Optional notes" />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save {mode === 'medicine' ? 'Medicine' : 'Feed'} Stock</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
