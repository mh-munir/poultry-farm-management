'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { recordSupplierProductPurchase } from '@/features/purchases/actions';
import { useToast } from '@/hooks/use-toast';

type SupplierProductsDialogProps = {
  partyId: number;
  partyName: string;
};

type ProductType = 'Both' | 'Egg' | 'Chicken';

export function SupplierProductsDialog({ partyId, partyName }: SupplierProductsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productType, setProductType] = useState<ProductType>('Both');
  const [eggQuantity, setEggQuantity] = useState('');
  const [eggPrice, setEggPrice] = useState('');
  const [chickenQuantity, setChickenQuantity] = useState('');
  const [chickenPrice, setChickenPrice] = useState('');
  const [error, setError] = useState('');
  const { success } = useToast();

  const showEgg = productType === 'Both' || productType === 'Egg';
  const showChicken = productType === 'Both' || productType === 'Chicken';

  const eggTotal = useMemo(() => {
    const q = Number(eggQuantity || 0);
    const p = Number(eggPrice || 0);
    return q * p;
  }, [eggQuantity, eggPrice]);

  const chickenTotal = useMemo(() => {
    const q = Number(chickenQuantity || 0);
    const p = Number(chickenPrice || 0);
    return q * p;
  }, [chickenQuantity, chickenPrice]);

  const totalPrice = eggTotal + chickenTotal;

  function resetForm() {
    setProductType('Both');
    setEggQuantity('');
    setEggPrice('');
    setChickenQuantity('');
    setChickenPrice('');
    setError('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (productType === 'Both') {
        if (!eggQuantity && !chickenQuantity) {
          setError('Please enter at least one quantity (Egg or Chicken).');
          setLoading(false);
          return;
        }
        if (eggQuantity && !eggPrice) {
          setError('Please enter egg price per piece.');
          setLoading(false);
          return;
        }
        if (chickenQuantity && !chickenPrice) {
          setError('Please enter chicken price per kg.');
          setLoading(false);
          return;
        }
      } else if (productType === 'Egg') {
        if (!eggQuantity) {
          setError('Please enter egg quantity.');
          setLoading(false);
          return;
        }
        if (!eggPrice) {
          setError('Please enter egg price per piece.');
          setLoading(false);
          return;
        }
      } else if (productType === 'Chicken') {
        if (!chickenQuantity) {
          setError('Please enter chicken quantity.');
          setLoading(false);
          return;
        }
        if (!chickenPrice) {
          setError('Please enter chicken price per kg.');
          setLoading(false);
          return;
        }
      }

      const result = await recordSupplierProductPurchase({
        partyId,
        eggQuantity: Number(eggQuantity || 0),
        eggPrice: Number(eggPrice || 0),
        chickenQuantity: Number(chickenQuantity || 0),
        chickenPrice: Number(chickenPrice || 0),
        totalPrice
      });

      if (!result.success) {
        setError(result.message);
        setLoading(false);
        return;
      }

      const supplierProductData = {
        partyId,
        partyName,
        productType,
        eggQuantity: eggQuantity ? Number(eggQuantity) : 0,
        eggPrice: eggPrice ? Number(eggPrice) : 0,
        eggTotal,
        chickenQuantity: chickenQuantity ? Number(chickenQuantity) : 0,
        chickenPrice: chickenPrice ? Number(chickenPrice) : 0,
        chickenTotal,
        totalPrice,
        timestamp: new Date().toISOString()
      };

      const existingData = localStorage.getItem('supplierProductsHistory');
      const historyData = existingData ? JSON.parse(existingData) : [];
      historyData.push(supplierProductData);
      localStorage.setItem('supplierProductsHistory', JSON.stringify(historyData));

      success(`Supplier products recorded for ${partyName}`);
      resetForm();
      setOpen(false);
    } catch (err) {
      setError('Failed to record supplier products.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white"
      >
        🏪 Supplier Products
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            resetForm();
          }
        }}
        title="Supplier Products"
        footer={
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => { setOpen(false); resetForm(); }} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" form="supplier-products-form" disabled={loading} className={loading ? 'opacity-75 cursor-not-allowed' : ''}>
              {loading ? '⏳ Saving...' : '💾 Save Products'}
            </Button>
          </div>
        }
      >
        <form
          id="supplier-products-form"
          onSubmit={handleSubmit}
          autoComplete="off"
          className="grid gap-4 sm:grid-cols-2"
        >
          {error && (
            <div className="sm:col-span-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
              <p className="text-base font-semibold text-rose-900">⚠️ Error</p>
              <p className="mt-1 text-sm text-rose-800">{error}</p>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Party Name</label>
            <input
              readOnly
              value={partyName}
              className="w-full rounded-md border bg-muted px-3 py-2 text-sm"
            />
            <input type="hidden" name="partyId" value={partyId} readOnly />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Product Type</label>
            <select
              value={productType}
              onChange={(event) => setProductType(event.target.value as ProductType)}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="Both">Both (Egg & Chicken)</option>
              <option value="Egg">Egg/Dim (pieces)</option>
              <option value="Chicken">Chicken/Murgi (kg)</option>
            </select>
          </div>

          {showEgg && (
            <>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Egg/Dim Quantity (pieces)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={eggQuantity}
                  onChange={(event) => setEggQuantity(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Enter egg quantity in pieces"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Egg/Dim Price Per Piece (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={eggPrice}
                  onChange={(event) => setEggPrice(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Enter price per piece"
                />
              </div>
            </>
          )}

          {showChicken && (
            <>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Chicken/Murgi Quantity (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chickenQuantity}
                  onChange={(event) => setChickenQuantity(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Enter chicken quantity in kg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Chicken/Murgi Price Per Kg (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chickenPrice}
                  onChange={(event) => setChickenPrice(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Enter price per kg"
                />
              </div>
            </>
          )}

          <div className="sm:col-span-2 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {showEgg && eggQuantity && eggPrice && (
                <div>
                  <p className="text-xs text-muted-foreground">Egg Total</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ৳ {eggTotal.toFixed(2)}
                  </p>
                </div>
              )}
              {showChicken && chickenQuantity && chickenPrice && (
                <div>
                  <p className="text-xs text-muted-foreground">Chicken Total</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ৳ {chickenTotal.toFixed(2)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Total Price</p>
                <p className="text-lg font-semibold text-green-600">
                  ৳ {totalPrice.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}
