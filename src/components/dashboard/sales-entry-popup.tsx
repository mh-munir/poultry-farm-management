'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createSaleTransactionWithToast } from '@/features/sales/actions';
import { getCustomerCurrentDue } from '@/features/parties/actions';
import { useToast } from '@/hooks/use-toast';

export type PartyOption = {
  id: number;
  name: string;
};

export type ProductOption = {
  id: number;
  name: string;
  code: string;
  productType: string;
  unit: string;
  defaultSellingPrice: number;
  defaultPurchasePrice?: number | null;
  stockQuantity: number;
};

type SalesProductRow = {
  rowId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
};

function createSalesProductRow(): SalesProductRow {
  return {
    rowId: `${Date.now()}-${Math.random()}`,
    productId: '',
    quantity: '',
    unitPrice: ''
  };
}

type SalesEntryPopupProps = {
  partyOptions: PartyOption[];
  productOptions: ProductOption[];
  defaultPartyId?: number;
  defaultPartyName?: string;
  onSuccess?: () => void;
  buttonClassName?: string;
  buttonChildren?: React.ReactNode;
};

export function SalesEntryPopup({
  partyOptions,
  productOptions,
  defaultPartyId,
  defaultPartyName,
  onSuccess,
  buttonClassName,
  buttonChildren
}: SalesEntryPopupProps) {
  const router = useRouter();
  const { success, error: showToastError } = useToast();
  const [open, setOpen] = useState(false);
  const [isSalesLoading, setIsSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState('');
  const [salesProduct, setSalesProduct] = useState<'feeds' | 'medicin' | 'both'>('feeds');
  const [salesNameError, setSalesNameError] = useState('');
  const [salesPartyId, setSalesPartyId] = useState<number | null>(defaultPartyId ?? null);
  const [salesPaymentAmount, setSalesPaymentAmount] = useState('');
  const [salesDiscount, setSalesDiscount] = useState('');
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [salesProductRows, setSalesProductRows] = useState<SalesProductRow[]>(() => [createSalesProductRow()]);
  const [salesFormValues, setSalesFormValues] = useState({
    name: defaultPartyName ?? '',
    mediaName: ''
  });
  const [previousDue, setPreviousDue] = useState(0);

  const handleSalesChange = (field: string, value: string) => {
    setSalesFormValues((current) => ({ ...current, [field]: value }));

    if (field === 'name') {
      const matchedParty = partyOptions.find((option) => option.name === value);
      setSalesPartyId(matchedParty ? matchedParty.id : null);
      setShowPartySuggestions(true);
      if (matchedParty) {
        setSalesNameError('');
      }
    }

    if (field === 'name' && salesNameError) {
      setSalesNameError('');
    }
  };

  const handlePartyNameFocus = () => {
    setShowPartySuggestions(true);
  };

  const handlePartyNameClick = () => {
    setShowPartySuggestions(true);
  };

  const handlePartyNameBlur = () => {
    setTimeout(() => setShowPartySuggestions(false), 150);
  };

  const selectPartySuggestion = (party: PartyOption) => {
    setSalesFormValues((current) => ({ ...current, name: party.name }));
    setSalesPartyId(party.id);
    setSalesNameError('');
    setShowPartySuggestions(false);
    getCustomerCurrentDue(party.id).then((due) => {
      setPreviousDue(due);
    });
  };

  const visibleProductOptions = useMemo(() => {
    return productOptions.filter((product) => {
      if (salesProduct === 'feeds') {
        return product.productType === 'FEED';
      }

      if (salesProduct === 'medicin') {
        return product.productType === 'MEDICINE';
      }

      return ['FEED', 'MEDICINE'].includes(product.productType);
    });
  }, [productOptions, salesProduct]);

  const productsById = useMemo(() => {
    return new Map(productOptions.map((product) => [String(product.id), product]));
  }, [productOptions]);

  const handleSalesProductTypeChange = (value: 'feeds' | 'medicin' | 'both') => {
    setSalesProduct(value);
    setSalesProductRows([createSalesProductRow()]);
  };

  const handleProductRowChange = (rowId: string, field: keyof Omit<SalesProductRow, 'rowId'>, value: string) => {
    setSalesProductRows((currentRows) => currentRows.map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      if (field === 'productId') {
        const selectedProduct = productsById.get(value);

        return {
          ...row,
          productId: value,
          unitPrice: selectedProduct ? String(selectedProduct.defaultSellingPrice) : ''
        };
      }

      return { ...row, [field]: value };
    }));
  };

  const addSalesProductRow = () => {
    setSalesProductRows((currentRows) => [...currentRows, createSalesProductRow()]);
  };

  const removeSalesProductRow = (rowId: string) => {
    setSalesProductRows((currentRows) => (
      currentRows.length > 1 ? currentRows.filter((row) => row.rowId !== rowId) : currentRows
    ));
  };

  const salesTotal = salesProductRows.reduce((total, row) => {
    return total + Number(row.quantity || 0) * Number(row.unitPrice || 0);
  }, 0);
  const salesNetTotal = Math.max(0, salesTotal - Number(salesDiscount || 0));
  const salesDueAmount = Math.max(0, salesNetTotal - Number(salesPaymentAmount || 0));
  const salesFinalDue = previousDue + salesDueAmount;

  const matchingPartyOptions = useMemo(() => {
    const searchTerm = salesFormValues.name.trim().toLowerCase();

    if (!searchTerm) {
      return partyOptions;
    }

    return partyOptions.filter((party) => party.name.toLowerCase().includes(searchTerm));
  }, [partyOptions, salesFormValues.name]);

  const handleSalesNameBlur = () => {
    if (!salesFormValues.name) {
      setSalesNameError('');
      return;
    }

    const matchedParty = partyOptions.find((option) => option.name === salesFormValues.name);

    if (!matchedParty) {
      setSalesNameError('Please select a valid party name from the list.');
      setSalesFormValues((current) => ({ ...current, name: '' }));
      setSalesPartyId(null);
      setPreviousDue(0);
    } else {
      setSalesNameError('');
      setSalesPartyId(matchedParty.id);
      getCustomerCurrentDue(matchedParty.id).then((due) => {
        setPreviousDue(due);
      });
    }
  };

  async function handleSalesSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalesError('');
    setIsSalesLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await createSaleTransactionWithToast(formData);

    if (result.success) {
      success(result.message);
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        setSalesFormValues({
          name: defaultPartyName ?? '',
          mediaName: ''
        });
        setSalesProductRows([createSalesProductRow()]);
        setSalesPartyId(defaultPartyId ?? null);
        setSalesPaymentAmount('');
        setSalesDiscount('');
        setPreviousDue(0);
        setIsSalesLoading(false);
        onSuccess?.();
      }, 500);
    } else {
      setSalesError(result.message);
      showToastError(result.message);
      setIsSalesLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        className={`w-full sm:w-auto ${buttonClassName ?? ''}`}
      >
        {buttonChildren ?? '📊 Sales Entry'}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !isSalesLoading) {
            setOpen(false);
            setSalesError('');
            setPreviousDue(0);
          }
        }}
        title="Sales Entry"
        footer={
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={isSalesLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="sales-entry-form"
              disabled={isSalesLoading}
              className={isSalesLoading ? 'opacity-75 cursor-not-allowed' : ''}
            >
              {isSalesLoading ? '⏳ Saving...' : '💾 Save Entry'}
            </Button>
          </div>
        }
      >
        <form
          id="sales-entry-form"
          autoComplete="off"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSalesSubmit}
        >
          {salesError && (
            <div className="sm:col-span-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
              <p className="text-base font-semibold text-rose-900">⚠️ Error</p>
              <p className="mt-1 text-sm text-rose-800">{salesError}</p>
            </div>
          )}

          <div className="sm:col-span-2 relative">
            <label className="mb-2 block text-sm font-medium">Party Name</label>
            <input
              name="name"
              autoComplete="off"
              value={salesFormValues.name}
              onChange={(event) => handleSalesChange('name', event.target.value)}
              onFocus={handlePartyNameFocus}
              onClick={handlePartyNameClick}
              onBlur={handlePartyNameBlur}
              required
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Click or type party name"
            />
            <input type="hidden" name="partyId" value={salesPartyId ?? ''} />
            {showPartySuggestions && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-white shadow-xl">
                {matchingPartyOptions.length > 0 ? matchingPartyOptions.map((party) => (
                  <button
                    key={party.id}
                    type="button"
                    onMouseDown={() => selectPartySuggestion(party)}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                  >
                    {party.name}
                  </button>
                )) : null}
                {matchingPartyOptions.length === 0 && partyOptions.length > 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No matching party found.</div>
                ) : null}
                {partyOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No parties available.</div>
                ) : null}
              </div>
            )}
            {salesNameError ? (
              <p className="mt-2 text-sm text-red-600">{salesNameError}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Media name</label>
              <input
                name="mediaName"
                autoComplete="off"
                value={salesFormValues.mediaName}
                onChange={(event) => handleSalesChange('mediaName', event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="Media name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Select Product</label>
              <select
                name="salesProduct"
                autoComplete="off"
                value={salesProduct}
                onChange={(event) => handleSalesProductTypeChange(event.target.value as 'feeds' | 'medicin' | 'both')}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="feeds">Feeds</option>
                <option value="medicin">Medicin</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-2 space-y-3 rounded-xl border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="text-sm font-medium">Sale Items</label>
              <Button type="button" variant="outline" size="sm" onClick={addSalesProductRow}>
                Add Item
              </Button>
            </div>

            <div className="max-h-[min(36vh,28rem)] space-y-3 overflow-y-auto pr-1">
              {salesProductRows.map((row, index) => {
                const selectedProduct = productsById.get(row.productId);

              return (
                <div key={row.rowId} className="flex flex-col gap-3 rounded-lg border bg-white p-3 xl:flex-row xl:items-top">
                  <div className="w-full xl:w-[230px] xl:flex-none">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Product</label>
                    <select
                      name="productId"
                      required={index === 0}
                      value={row.productId}
                      onChange={(event) => handleProductRowChange(row.rowId, 'productId', event.target.value)}
                      className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm truncate"
                    >
                      <option value="">Select stock product</option>
                      {visibleProductOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.productType} - Stock {product.stockQuantity} {product.unit}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground" aria-hidden={!selectedProduct}>
                      {selectedProduct ? `Stock: ${selectedProduct.stockQuantity} ${selectedProduct.unit}` : '\u00A0'}
                    </p>
                  </div>

                  <div className="w-full xl:w-[110px]">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Quantity</label>
                    <input
                      name="quantity"
                      autoComplete="off"
                      type="number"
                      min="0"
                      step="any"
                      value={row.quantity}
                      onChange={(event) => handleProductRowChange(row.rowId, 'quantity', event.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Qty"
                    />
                  </div>

                  <div className="w-full xl:w-[110px]">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Buy Rate</label>
                    <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <p className="font-semibold text-slate-900">
                        {selectedProduct?.defaultPurchasePrice != null ? `${Number(selectedProduct.defaultPurchasePrice).toLocaleString('en-BD', { maximumFractionDigits: 2 })}` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="w-full xl:w-[110px]">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Sale Price</label>
                    <input
                      name="unitPrice"
                      autoComplete="off"
                      type="number"
                      min="0"
                      step="any"
                      value={row.unitPrice}
                      onChange={(event) => handleProductRowChange(row.rowId, 'unitPrice', event.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Price"
                    />
                  </div>

                  

                  <div className="flex items-center xl:w-[40px]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSalesProductRow(row.rowId)}
                      disabled={salesProductRows.length === 1}
                      className="h-10 w-10 shrink-0 bg-white text-slate-600 hover:bg-slate-100"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-8 w-8" />
                    </Button>
                  </div>
                </div>
              );
              })}
            </div>

            {visibleProductOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock products found for this selection.</p>
            ) : null}
          </div>

          <div className="sm:col-span-2 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-slate-50 rounded-[20px] p-4 text-sm">
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3">
              <label className="block text-xs font-medium text-slate-500">Discount</label>
              <input
                name="discount"
                autoComplete="off"
                type="number"
                min="0"
                step="any"
                value={salesDiscount}
                onChange={(event) => setSalesDiscount(event.target.value)}
                className="mt-2 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-950"
              />
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3">
              <label className="block text-xs font-medium text-slate-500">Total Amount</label>
              <input value={salesNetTotal.toFixed(2)} readOnly className="mt-2 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-950" />
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3">
              <label className="block text-xs font-medium text-slate-500">Paid Amount</label>
              <input
                name="paymentAmount"
                autoComplete="off"
                type="number"
                min="0"
                step="any"
                value={salesPaymentAmount}
                onChange={(event) => setSalesPaymentAmount(event.target.value)}
                className="mt-2 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-950"
              />
            </div>
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3">
<label className="block text-xs font-medium text-slate-500">Final Due</label>
               <input value={salesFinalDue.toFixed(2)} readOnly className="mt-2 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-950" />
            </div>
          </div>

          <input type="hidden" name="paymentMethod" value="CASH" readOnly />
          <input type="hidden" name="discount" value={salesDiscount} readOnly />
          <input type="hidden" name="notes" value={salesFormValues.mediaName ? `Media: ${salesFormValues.mediaName}` : ''} readOnly />
        </form>
      </Dialog>
    </>
  );
}
