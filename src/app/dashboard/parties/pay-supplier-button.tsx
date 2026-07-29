'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaySupplierModal } from './pay-supplier-modal';

type PaySupplierButtonProps = {
  buttonClassName?: string;
};

export function PaySupplierButton({ buttonClassName }: PaySupplierButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        <Wallet className="mr-2 h-4 w-4" />
        Pay Supplier
      </Button>
      <PaySupplierModal open={open} onOpenChange={setOpen} />
    </>
  );
}
