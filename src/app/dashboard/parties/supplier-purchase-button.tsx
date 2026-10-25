'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupplierPurchaseModal } from './supplier-purchase-modal';
import { useLocale } from '@/i18n/provider';

type SupplierPurchaseButtonProps = {
  buttonClassName?: string;
};

export function SupplierPurchaseButton({ buttonClassName }: SupplierPurchaseButtonProps) {
  const [open, setOpen] = useState(false);
  const { dict } = useLocale();

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        <ShoppingCart className="h-4 w-4" />
        {dict.common.supplierPurchase}
      </Button>
      <SupplierPurchaseModal open={open} onOpenChange={setOpen} />
    </>
  );
}