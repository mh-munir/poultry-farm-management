'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { getSupplierOptions, createSupplierPurchase } from '@/features/parties/actions';

type SupplierPurchaseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SupplierPurchaseModal({ open, onOpenChange }: SupplierPurchaseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partyOptions, setPartyOptions] = useState<ComboboxOption[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [productCategory, setProductCategory] = useState('EGG');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Piece');
  const [unitPrice, setUnitPrice] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const { success, error: showError } = useToast();

  const totalAmount = Number(quantity || 0) * Number(unitPrice || 0);
  const dueAmount = totalAmount - Number(paidAmount || 0);

  useEffect(() => {
    if (open) {
      getSupplierOptions().then((options) => {
        setPartyOptions(options.map((o) => ({ value: String(o.id), label: o.name })));
      });
      setSelectedPartyId(null);
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setProductCategory('EGG');
      setProductName('');
      setQuantity('');
      setUnit('Piece');
      setUnitPrice('');
      setPaidAmount('');
      setPaymentMethod('Cash');
      setReferenceNumber('');
      setNotes('');
      setFormError('');
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    const formData = new FormData(event.currentTarget);
    const result = await createSupplierPurchase(formData);
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.message);
      showError(result.message);
      return;
    }

    success(result.message);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Supplier Purchase">
      <form onSubmit={handleSubmit} className="mt-2 grid gap-4 md:grid-cols-2">
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
            onValueChange={(value) => setSelectedPartyId(Number(value) || null)}
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
            onChange={(e) => setProductCategory(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="EGG">Egg</option>
            <option value="CHICKEN">Chicken</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Product Name *</label>
          <input
            type="text"
            name="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="e.g. Eggs, Chicken"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Quantity *</label>
          <input
            type="number"
            name="quantity"
            min="0.0001"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Enter quantity"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Unit *</label>
          <select
            name="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="Piece">Piece</option>
            <option value="Dozen">Dozen</option>
            <option value="Kg">Kg</option>
            <option value="Tray">Tray</option>
            <option value="Box">Box</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Unit Price *</label>
          <input
            type="number"
            name="unitPrice"
            min="0.01"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Enter unit price"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Total Amount</label>
          <input
            type="number"
            name="totalAmount"
            min="0"
            step="0.01"
            value={totalAmount.toFixed(2)}
            readOnly
            className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm outline-none"
          />
        </div>

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

        <div>
          <label className="mb-2 block text-sm font-medium">Due Amount</label>
          <input
            type="number"
            name="dueAmount"
            min="0"
            step="0.01"
            value={dueAmount.toFixed(2)}
            readOnly
            className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Payment Method</label>
          <select
            name="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="Mobile Banking">Mobile Banking</option>
            <option value="Credit">Credit</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Reference / Invoice No.</label>
          <input
            type="text"
            name="referenceNumber"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Optional"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Notes</label>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Optional notes"
          />
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedPartyId || !quantity || Number(quantity) <= 0 || !unitPrice || Number(unitPrice) <= 0 || Number(paidAmount || 0) > totalAmount}>
            {isSubmitting ? 'Saving...' : 'Save Purchase'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}