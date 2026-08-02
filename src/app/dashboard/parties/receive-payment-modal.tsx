'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { getCustomerOptions, getCustomerCurrentDue, receiveCustomerPayment } from '@/features/parties/actions';

type ReceivePaymentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReceivePaymentModal({ open, onOpenChange }: ReceivePaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partyOptions, setPartyOptions] = useState<ComboboxOption[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [currentDue, setCurrentDue] = useState(0);
  const [receiveAmount, setReceiveAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const router = useRouter();
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (open) {
      getCustomerOptions().then((options) => {
        setPartyOptions(options.map((o) => ({ value: String(o.id), label: o.name })));
      });
      setSelectedPartyId(null);
      setCurrentDue(0);
      setReceiveAmount('');
      setPaymentDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const handlePartyChange = async (value: string) => {
    const id = Number(value);
    setSelectedPartyId(id);
    if (id) {
      const due = await getCustomerCurrentDue(id);
      setCurrentDue(due);
    } else {
      setCurrentDue(0);
    }
    setReceiveAmount('');
  };

  const remainingDue = currentDue - (Number(receiveAmount) || 0);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await receiveCustomerPayment(formData);
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
    <Dialog open={open} onOpenChange={onOpenChange} title="Receive Payment">
      <form onSubmit={handleSubmit} className="mt-2 grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2">
        <input type="hidden" name="status" value="COMPLETED" />
        <input type="hidden" name="paymentMethod" value="Cash" />

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Party</label>
          <SearchableCombobox
            options={partyOptions}
            value={String(selectedPartyId ?? '')}
            onValueChange={handlePartyChange}
            placeholder="Search customer..."
            emptyText="No customer found"
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
          <label className="mb-2 block text-sm font-medium text-slate-700">Receive Amount</label>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            value={receiveAmount}
            onChange={(e) => setReceiveAmount(e.target.value)}
            required
            className="w-full h-[50px] rounded-[12px] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            placeholder="Enter amount"
          />
        </div>

        <div className="md:col-span-2 grid gap-3 md:grid-cols-3 bg-slate-50 rounded-[20px] p-4">
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Current Due</label>
            <input
              type="text"
              readOnly
              value={`৳ ${currentDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Receive Amount</label>
            <input
              type="text"
              readOnly
              value={`৳ ${(Number(receiveAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Remaining Due</label>
            <input
              type="text"
              readOnly
              value={`৳ ${remainingDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className={`mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold ${remainingDue < 0 ? 'text-red-600' : remainingDue === 0 && receiveAmount ? 'text-emerald-600' : 'text-slate-950'}`}
            />
          </div>
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedPartyId || !receiveAmount || Number(receiveAmount) <= 0 || remainingDue < 0}>
            {isSubmitting ? 'Saving...' : 'Save Payment'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
