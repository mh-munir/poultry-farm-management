'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './button';

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[110] flex min-h-screen items-end justify-center overflow-hidden px-4 py-4 text-left transition-all duration-200 sm:items-center ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[20px] border border-slate-200/80 bg-slate-50/90 shadow-[0_24px_80px_rgba(15,23,42,0.12),0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-200 sm:max-w-3xl ${
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="sticky top-0 z-20 flex shrink-0 flex-col gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 break-words">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-[12px] p-2 text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
        {footer ? (
          <div className="sticky bottom-0 z-20 flex shrink-0 flex-col items-end gap-3 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
