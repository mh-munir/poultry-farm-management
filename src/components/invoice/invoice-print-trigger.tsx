'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/provider';

export function InvoicePrintTrigger() {
  const { dict } = useLocale();
  
  return (
    <Button type="button" onClick={() => window.print()} className="no-print fixed right-4 top-4 z-50 shadow-lg">
      <Printer className="h-4 w-4" />
      {dict.common.print}
    </Button>
  );
}
