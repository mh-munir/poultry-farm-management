'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { getSupplierOptions, getSupplierCurrentPayable, createSupplierPurchase } from '@/features/parties/actions';

type SupplierPurchaseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PurchaseLine = {
  productCategory: 'EGG' | 'CHICKEN';
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
};

export function SupplierPurchaseModal({ open, onOpenChange }: SupplierPurchaseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partyOptions, setPartyOptions] = useState<ComboboxOption[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [productCategory, setProductCategory] = useState<'EGG' | 'CHICKEN' | 'BOTH'>('EGG');
  const [eggQuantity, setEggQuantity] = useState('');
  const [eggUnitPrice, setEggUnitPrice] = useState('');
  const [chickenQuantity, setChickenQuantity] = useState('');
  const [chickenUnitPrice, setChickenUnitPrice] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [previousDue, setPreviousDue] = useState(0);
  const [formError, setFormError] = useState('');
  const router = useRouter();
  const { success, error: showError } = useToast();

  const eggTotal = useMemo(() => Number(eggQuantity || 0) * Number(eggUnitPrice || 0), [eggQuantity, eggUnitPrice]);
  const chickenTotal = useMemo(() => Number(chickenQuantity || 0) * Number(chickenUnitPrice || 0), [chickenQuantity, chickenUnitPrice]);

  const totalAmount = useMemo(() => {
    if (productCategory === 'EGG') {
      return eggTotal;
    }

    if (productCategory === 'CHICKEN') {
      return chickenTotal;
    }

    return eggTotal + chickenTotal;
  }, [productCategory, eggTotal, chickenTotal]);

  const dueAmount = useMemo(() => totalAmount - Number(paidAmount || 0), [totalAmount, paidAmount]);
  const finalDue = previousDue + dueAmount;
  const showEgg = productCategory === 'EGG' || productCategory === 'BOTH';
  const showChicken = productCategory === 'CHICKEN' || productCategory === 'BOTH';

  useEffect(() => {
    if (!open) {
      return;
    }

    getSupplierOptions().then((options) => {
      setPartyOptions(options.map((option) => ({ value: String(option.id), label: option.name })));
    });

    setSelectedPartyId(null);
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setProductCategory('EGG');
    setEggQuantity('');
    setEggUnitPrice('');
    setChickenQuantity('');
    setChickenUnitPrice('');
    setPaidAmount('');
    setPreviousDue(0);
    setFormError('');
  }, [open]);

  const buildPurchaseLines = (): PurchaseLine[] => {
    const lines: PurchaseLine[] = [];

    if (showEgg && Number(eggQuantity || 0) > 0) {
      lines.push({
        productCategory: 'EGG',
        productName: 'Egg',
        quantity: Number(eggQuantity || 0),
        unit: 'pcs',
        unitPrice: Number(eggUnitPrice || 0),
        totalAmount: eggTotal
      });
    }

    if (showChicken && Number(chickenQuantity || 0) > 0) {
      lines.push({
        productCategory: 'CHICKEN',
        productName: 'Chicken',
        quantity: Number(chickenQuantity || 0),
        unit: 'kg',
        unitPrice: Number(chickenUnitPrice || 0),
        totalAmount: chickenTotal
      });
    }

    return lines;
  };

  const getPaymentSplits = (lines: PurchaseLine[]) => {
    const paid = Number(paidAmount || 0);

    if (lines.length <= 1) {
      return lines.map(() => paid);
    }

    const totalLines = lines.reduce((sum, line) => sum + line.totalAmount, 0);
    const firstPaid = Number(((lines[0].totalAmount / totalLines) * paid).toFixed(2));
    const secondPaid = Number(((lines[1].totalAmount / totalLines) * paid).toFixed(2));
    const remainder = Number((paid - firstPaid - secondPaid).toFixed(2));

    return [firstPaid, secondPaid + remainder];
  };

  const validateForm = () => {
    if (!selectedPartyId) {
      return 'Supplier is required.';
    }

    if (!purchaseDate) {
      return 'Purchase date is required.';
    }

    if (productCategory === 'EGG') {
      if (Number(eggQuantity || 0) <= 0 || Number(eggUnitPrice || 0) <= 0) {
        return 'Please enter egg quantity and unit price.';
      }
    }

    if (productCategory === 'CHICKEN') {
      if (Number(chickenQuantity || 0) <= 0 || Number(chickenUnitPrice || 0) <= 0) {
        return 'Please enter chicken quantity and unit price.';
      }
    }

    if (productCategory === 'BOTH') {
      const hasEgg = Number(eggQuantity || 0) > 0;
      const hasChicken = Number(chickenQuantity || 0) > 0;

      if (!hasEgg && !hasChicken) {
        return 'Please enter egg or chicken quantity.';
      }

      if (hasEgg && Number(eggUnitPrice || 0) <= 0) {
        return 'Please enter a valid egg unit price.';
      }

      if (hasChicken && Number(chickenUnitPrice || 0) <= 0) {
        return 'Please enter a valid chicken unit price.';
      }
    }

    if (totalAmount <= 0) {
      return 'Total amount must be greater than zero.';
    }

    if (Number(paidAmount || 0) < 0) {
      return 'Paid amount cannot be negative.';
    }

    if (Number(paidAmount || 0) > totalAmount) {
      return 'Paid amount cannot exceed total amount.';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      setIsSubmitting(false);
      return;
    }

    const lines = buildPurchaseLines();
    const paymentSplits = getPaymentSplits(lines);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const formData = new FormData();

      formData.set('partyId', String(selectedPartyId ?? ''));
      formData.set('purchaseDate', purchaseDate);
      formData.set('productCategory', line.productCategory);
      formData.set('productName', line.productName);
      formData.set('quantity', String(line.quantity));
      formData.set('unit', line.unit);
      formData.set('unitPrice', String(line.unitPrice));
      formData.set('totalAmount', String(line.totalAmount));
      formData.set('paidAmount', String(paymentSplits[index]));
      formData.set('paymentMethod', 'Cash');
      formData.set('referenceNumber', '');
      formData.set('notes', '');

      const result = await createSupplierPurchase(formData);
      if (!result.success) {
        setFormError(result.message);
        showError(result.message);
        setIsSubmitting(false);
        return;
      }
    }

    success('Supplier purchase recorded successfully.');
    router.refresh();
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const isSubmitDisabled =
    isSubmitting ||
    !selectedPartyId ||
    totalAmount <= 0 ||
    Number(paidAmount || 0) > totalAmount ||
    (productCategory === 'EGG' && (Number(eggQuantity || 0) <= 0 || Number(eggUnitPrice || 0) <= 0)) ||
    (productCategory === 'CHICKEN' && (Number(chickenQuantity || 0) <= 0 || Number(chickenUnitPrice || 0) <= 0)) ||
    (productCategory === 'BOTH' && !(Number(eggQuantity || 0) > 0 || Number(chickenQuantity || 0) > 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Supplier Purchase">
      <form onSubmit={handleSubmit} className="mt-2 grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2">
        {formError && (
          <div className="md:col-span-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
            <p className="text-base font-semibold text-rose-900">⚠️ Error</p>
            <p className="mt-1 text-sm text-rose-800">{formError}</p>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Supplier *</label>
          <SearchableCombobox
            options={partyOptions}
            value={String(selectedPartyId ?? '')}
            onValueChange={(value) => {
    const id = Number(value) || null;
    setSelectedPartyId(id);
    if (id) {
      getSupplierCurrentPayable(id).then((payable) => {
        setPreviousDue(payable);
      });
    } else {
      setPreviousDue(0);
    }
  }}
            placeholder="Search supplier..."
            emptyText="No supplier found"
            required
          />
          <input type="hidden" name="partyId" value={String(selectedPartyId ?? '')} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Purchase Date *</label>
          <input
            type="date"
            name="purchaseDate"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Product Category *</label>
          <select
            name="productCategory"
            value={productCategory}
            onChange={(e) => setProductCategory(e.target.value as 'EGG' | 'CHICKEN' | 'BOTH')}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="EGG">Egg</option>
            <option value="CHICKEN">Chicken</option>
            <option value="BOTH">Both</option>
          </select>
        </div>

        {showEgg && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium">Egg Quantity *</label>
              <input
                type="number"
                name="eggQuantity"
                min="0"
                step="0.01"
                value={eggQuantity}
                onChange={(e) => setEggQuantity(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Enter egg quantity"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Per Piece Price *</label>
              <input
                type="number"
                name="eggUnitPrice"
                min="0"
                step="0.01"
                value={eggUnitPrice}
                onChange={(e) => setEggUnitPrice(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Enter egg unit price"
              />
            </div>
          </>
        )}

        {showChicken && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium">Chicken Total KG *</label>
              <input
                type="number"
                name="chickenQuantity"
                min="0"
                step="0.01"
                value={chickenQuantity}
                onChange={(e) => setChickenQuantity(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Enter chicken total kg"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Per KG Price *</label>
              <input
                type="number"
                name="chickenUnitPrice"
                min="0"
                step="0.01"
                value={chickenUnitPrice}
                onChange={(e) => setChickenUnitPrice(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Enter chicken unit price"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">Paid Amount</label>
          <input
            type="number"
            name="paidAmount"
            min="0"
            step="0.01"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="0.00"
          />
        </div>

        <div className="md:col-span-2 grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-slate-50 rounded-[20px] p-4">
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Supplier Purchase Total</label>
            <input
              type="text"
              readOnly
              value={`৳ ${totalAmount.toFixed(2)}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Egg Total</label>
            <input
              type="text"
              readOnly
              value={`৳ ${eggTotal.toFixed(2)}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Chicken Total</label>
            <input
              type="text"
              readOnly
              value={`৳ ${chickenTotal.toFixed(2)}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Discount</label>
            <input
              type="text"
              readOnly
              value="৳ 0.00"
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Total Amount</label>
            <input
              type="text"
              readOnly
              value={`৳ ${totalAmount.toFixed(2)}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Paid Amount</label>
            <input
              type="text"
              readOnly
              value={`৳ ${Number(paidAmount || 0).toFixed(2)}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
<div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
             <label className="text-xs font-medium text-slate-500">Final Due</label>
             <input
               type="text"
               readOnly
               value={`৳ ${finalDue.toFixed(2)}`}
               className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
             />
           </div>
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitDisabled}>
            {isSubmitting ? 'Saving...' : 'Save Purchase'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
