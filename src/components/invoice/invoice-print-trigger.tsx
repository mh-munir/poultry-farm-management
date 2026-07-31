'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InvoicePrintTrigger() {
  return (
    <Button type="button" onClick={() => window.print()} className="no-print fixed right-4 top-4 z-50 shadow-lg">
      <Printer className="h-4 w-4" />
      Print
    </Button>
  );
}
