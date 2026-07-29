'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className="no-print"
    >
      <Printer className="mr-2 h-4 w-4" />
      Print Statement
    </Button>
  );
}
