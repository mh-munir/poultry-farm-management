'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PayCompanyModal } from './pay-company-modal';

export function PayCompanyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Wallet className="mr-2 h-4 w-4" />
        Pay Company
      </Button>
      <PayCompanyModal open={open} onOpenChange={setOpen} />
    </>
  );
}
