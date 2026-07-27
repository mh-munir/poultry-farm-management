'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type Props = {
  partyId: number;
  partyName: string;
  title: string;
  buttonLabel: string;
  dueLabel: string;
  dueAmount: number;
  toastSuccessMessage: string;
  recordPaymentForParty: (formData: FormData) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  buttonClassName?: string;
};

export default function PaymentFormDialog({
  partyId,
  partyName,
  title,
  buttonLabel,
  dueLabel,
  dueAmount,
  toastSuccessMessage,
  recordPaymentForParty,
  buttonClassName
}: Props) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { success, error: showError } = useToast();

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        <Wallet className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen} title={title}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            const formData = new FormData(event.currentTarget);
            const result = await recordPaymentForParty(formData);
            setIsSubmitting(false);

            if (!result.success) {
              showError(result.message);
              return;
            }

            success(toastSuccessMessage);
            setOpen(false);
            router.refresh();
          }}
          className="mt-2 grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-2"
        >
          <input type="hidden" name="partyId" value={String(partyId)} />
          <input type="hidden" name="status" value="COMPLETED" />
          <div className="md:col-span-2 rounded-2xl border border-border bg-slate-50 p-4">
            <p className="text-sm font-medium text-muted-foreground">Party</p>
            <p className="mt-2 text-base font-semibold text-foreground">{partyName}</p>
            <p className="mt-4 text-sm text-muted-foreground">{dueLabel}</p>
            <p className="mt-1 text-lg font-semibold">৳ {dueAmount.toFixed(2)}</p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Payment amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="amount"
              required
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Payment date</label>
            <input
              type="date"
              name="paymentDate"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Payment method</label>
            <select
              name="paymentMethod"
              required
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="Mobile">Mobile</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Reference number</label>
            <input
              name="referenceNumber"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Optional"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Notes</label>
            <textarea
              name="notes"
              rows={3}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Optional notes"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving payment...' : 'Save payment'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
