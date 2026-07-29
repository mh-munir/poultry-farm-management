'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReceivePaymentModal } from './receive-payment-modal';

type ReceivePaymentButtonProps = {
  buttonClassName?: string;
};

export function ReceivePaymentButton({ buttonClassName }: ReceivePaymentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        <Wallet className="mr-2 h-4 w-4" />
        Receive Payment
      </Button>
      <ReceivePaymentModal open={open} onOpenChange={setOpen} />
    </>
  );
}
