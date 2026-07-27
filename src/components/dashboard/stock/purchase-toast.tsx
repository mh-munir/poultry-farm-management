'use client';

import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

type Props = {
  initialSuccess?: string;
};

export function PurchaseToast({ initialSuccess }: Props) {
  const [message, setMessage] = useState<string | undefined>(initialSuccess);
  const [open, setOpen] = useState<boolean>(!!initialSuccess);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => setOpen(false), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!message) return;

    const clearFlash = async () => {
      await fetch('/dashboard/stock/clear-purchase-success', { method: 'POST' });
    };

    clearFlash();
  }, [message]);

  if (!open || !message) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <div className="flex max-w-xl items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-top-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-emerald-600">
          <CheckCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-900">Success</p>
          <p className="text-sm leading-5 text-emerald-900">{message}</p>
        </div>
      </div>
    </div>
  );
}
