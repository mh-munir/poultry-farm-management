'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SaleForm } from '@/app/dashboard/sales/sale-form';
import type { CustomerOption, ProductOption } from '@/app/dashboard/sales/sale-form';

type SalesEntryDialogProps = {
  partyId: number;
  partyName: string;
  customers: CustomerOption[];
  products: ProductOption[];
};

export function SalesEntryDialog({ partyId, partyName, customers, products }: SalesEntryDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white"
      >
        📊 Sales Entry
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
          }
        }}
        title="Sales Entry"
        footer={
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <SaleForm
          customers={customers}
          products={products}
          selectedPartyId={partyId}
        />
      </Dialog>
    </>
  );
}
