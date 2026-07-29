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
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={`relative z-10 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12),0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-200 ${
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[70vh] px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
