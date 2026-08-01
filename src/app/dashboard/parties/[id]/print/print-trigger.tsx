'use client';

import { Printer } from 'lucide-react';

export default function PrintTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print fixed right-2 top-2 sm:right-4 sm:top-4 z-50 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-lg transition hover:bg-slate-700"
    >
      <Printer className="h-4 w-4" />
      Print
    </button>
  );
}
