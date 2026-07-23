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
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => onOpenChange(false)} 
      />
      <div className={`relative z-10 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl transition-all duration-300 ${
        open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer ? <div className="mt-8 border-t border-gray-200 pt-6">{footer}</div> : null}
      </div>
    </div>
  );
}
