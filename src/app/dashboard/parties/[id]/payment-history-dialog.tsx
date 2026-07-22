'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { PartyPaymentsSection } from './party-payments-section';

type InitialPayment = {
  id: number;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
  notes: string | null;
};

type PaymentHistoryDialogProps = {
  partyId: number;
  initialPayments: InitialPayment[];
  recordPaymentForParty: (formData: FormData) => Promise<void>;
  updatePaymentForParty: (formData: FormData) => Promise<void>;
  deletePaymentForParty: (formData: FormData) => Promise<void>;
};

export function PaymentHistoryDialog({
  partyId,
  initialPayments,
  recordPaymentForParty,
  updatePaymentForParty,
  deletePaymentForParty
}: PaymentHistoryDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Wallet className="mr-2 h-4 w-4" />
        Pay now
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Payment now">
        <PartyPaymentsSection
          partyId={partyId}
          initialPayments={initialPayments}
          recordPaymentForParty={recordPaymentForParty}
          updatePaymentForParty={updatePaymentForParty}
          deletePaymentForParty={deletePaymentForParty}
        />
      </Dialog>
    </>
  );
}
