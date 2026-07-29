'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
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
      setPaymentMethod('Cash');
      setReferenceNumber('');
      setNotes('');
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Receive Payment">
      <form onSubmit={handleSubmit} className="mt-2 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="status" value="COMPLETED" />

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Party</label>
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
          <label className="mb-2 block text-sm font-medium">Payment Date</label>
          <input
            type="date"
            name="paymentDate"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Receive Amount</label>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            value={receiveAmount}
            onChange={(e) => setReceiveAmount(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Enter amount"
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
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Mobile Banking">Mobile Banking</option>
            <option value="Cheque">Cheque</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Reference / Transaction ID</label>
          <input
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

        <div className="md:col-span-2 rounded-2xl border border-border bg-slate-50 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Due</p>
              <p className="mt-1 text-lg font-semibold">৳ {currentDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receive Amount</p>
              <p className="mt-1 text-lg font-semibold">৳ {(Number(receiveAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Remaining Due</p>
              <p className={`mt-1 text-lg font-semibold ${remainingDue < 0 ? 'text-red-600' : remainingDue === 0 && receiveAmount ? 'text-emerald-600' : ''}`}>
                ৳ {remainingDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
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
