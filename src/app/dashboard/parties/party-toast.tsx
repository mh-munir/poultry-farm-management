'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

type PartyToastProps = {
  success?: string;
  error?: string;
};

export function PartyToast({ success, error }: PartyToastProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const message = success || error || '';
  const variant = success ? 'success' : error ? 'error' : 'info';

  useEffect(() => {
    if (message && !dismissed) {
      setOpen(true);
    }
  }, [message, dismissed]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), 3500);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!message) return;

    const clearFlash = async () => {
      await fetch('/dashboard/parties/clear-party-success', { method: 'POST' });
    };

    clearFlash();
  }, [message]);

  if (!open || !message) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <div
        className={`flex max-w-xl items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg transition-all duration-200 ${
          variant === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-rose-200 bg-rose-50 text-rose-900'
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-current">
          {variant === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-semibold">{variant === 'success' ? 'Success' : 'Error'}</p>
          <p className="text-sm leading-5 text-current">{message}</p>
        </div>
      </div>
    </div>
  );
}
