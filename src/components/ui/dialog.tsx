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
      className={`fixed inset-0 z-[110] flex min-h-screen items-end sm:items-center justify-center overflow-y-auto px-4 py-4 text-left transition-all duration-200 ${
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
        className={`relative z-10 w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl rounded-[20px] overflow-hidden border border-slate-200/80 bg-slate-50/90 shadow-[0_24px_80px_rgba(15,23,42,0.12),0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-200 ${
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 break-words">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-[12px] p-2 text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
        {footer ? (
          <div className="flex flex-col items-end gap-3 border-t border-slate-200/80 bg-white/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
