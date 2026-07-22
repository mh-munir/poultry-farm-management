'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

type Props = {
  partyId: number;
  recordPaymentForParty: (formData: FormData) => Promise<void> | void;
};

export default function PaymentFormDialog({ partyId, recordPaymentForParty }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Wallet className="mr-2 h-4 w-4" />
        Pay now
      </Button>

      <Dialog open={open} onOpenChange={setOpen} title="Record payment">
        <form action={async (formData: FormData) => {
          await recordPaymentForParty(formData);
          setOpen(false);
        }} className="mt-2 grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-2">
          <input type="hidden" name="partyId" value={String(partyId)} />
          <div>
            <label className="mb-2 block text-sm font-medium">Amount</label>
            <input type="number" min="0.01" step="0.01" name="amount" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="Enter amount" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Payment method</label>
            <select name="paymentMethod" required className="w-full rounded-md border bg-background px-3 py-2">
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="Mobile">Mobile</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Reference number</label>
            <input name="referenceNumber" className="w-full rounded-md border bg-background px-3 py-2" placeholder="Optional" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Status</label>
            <select name="status" defaultValue="COMPLETED" className="w-full rounded-md border bg-background px-3 py-2">
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Notes</label>
            <textarea name="notes" rows={3} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Optional notes" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Save payment</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
