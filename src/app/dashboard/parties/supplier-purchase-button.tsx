'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupplierPurchaseModal } from './supplier-purchase-modal';

type SupplierPurchaseButtonProps = {
  buttonClassName?: string;
};

export function SupplierPurchaseButton({ buttonClassName }: SupplierPurchaseButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        <ShoppingCart className="mr-2 h-4 w-4" />
        Supplier Purchase
      </Button>
      <SupplierPurchaseModal open={open} onOpenChange={setOpen} />
    </>
  );
}