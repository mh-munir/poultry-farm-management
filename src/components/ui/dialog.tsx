'use client';

import * as React from 'react';
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
  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center px-4 py-4 transition-all duration-200 ${
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
        className={`relative z-10 w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl rounded-[12px] border border-slate-200/80 bg-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.12),0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-200 ${
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-[12px] p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-5rem)] px-4 py-4 sm:px-6 sm:py-6">{children}</div>
        {footer ? (
          <div className="flex flex-col items-stretch gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4 border-t border-slate-200 bg-white/80">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
