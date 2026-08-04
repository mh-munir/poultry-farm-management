'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { getSupplierOptions, getSupplierCurrentPayable, paySupplierPayment } from '@/features/parties/actions';

type PaySupplierModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PaySupplierModal({ open, onOpenChange }: PaySupplierModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partyOptions, setPartyOptions] = useState<ComboboxOption[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [currentPayable, setCurrentPayable] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const router = useRouter();
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (open) {
      getSupplierOptions().then((options) => {
        setPartyOptions(options.map((o) => ({ value: String(o.id), label: o.name })));
      });
      setSelectedPartyId(null);
      setCurrentPayable(0);
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const handlePartyChange = async (value: string) => {
    const id = Number(value);
    if (!Number.isFinite(id) || id <= 0) {
      setSelectedPartyId(null);
      setCurrentPayable(0);
    } else {
      setSelectedPartyId(id);
      const payable = await getSupplierCurrentPayable(id);
      setCurrentPayable(payable);
    }
    setPaymentAmount('');
  };

  const remainingPayable = currentPayable - (Number(paymentAmount) || 0);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await paySupplierPayment(formData);
    setIsSubmitting(false);

    if (!result.success) {
      showError(result.message);
      return;
    }

    success(result.message);
    router.refresh();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Pay Supplier">
      <form onSubmit={handleSubmit} className="mt-2 grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2">
        <input type="hidden" name="status" value="COMPLETED" />
        <input type="hidden" name="paymentMethod" value="Cash" />

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Party</label>
          <SearchableCombobox
            options={partyOptions}
            value={String(selectedPartyId ?? '')}
            onValueChange={handlePartyChange}
            placeholder="Search supplier..."
            emptyText="No supplier found"
            required
          />
          <input type="hidden" name="partyId" value={String(selectedPartyId ?? '')} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Payment Date</label>
          <input
            type="date"
            name="paymentDate"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            className="w-full h-[50px] rounded-[12px] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Payment Amount</label>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
            className="w-full h-[50px] rounded-[12px] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            placeholder="Enter amount"
          />
        </div>

        <div className="md:col-span-2 grid gap-3 md:grid-cols-3 bg-slate-50 rounded-[20px] p-4">
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Current Payable</label>
            <input
              type="text"
              readOnly
              value={`৳ ${currentPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Payment Amount</label>
            <input
              type="text"
              readOnly
              value={`৳ ${(Number(paymentAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Remaining Payable</label>
            <input
              type="text"
              readOnly
              value={`৳ ${remainingPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className={`mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold ${remainingPayable < 0 ? 'text-red-600' : remainingPayable === 0 && paymentAmount ? 'text-emerald-600' : 'text-slate-950'}`}
            />
          </div>
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedPartyId || !paymentAmount || Number(paymentAmount) <= 0 || remainingPayable < 0}>
            {isSubmitting ? 'Saving...' : 'Save Payment'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
