'use client';

import * as React from 'react';
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
      className={`fixed inset-0 z-50 flex items-center justify-center ${open ? 'block' : 'hidden'}`}
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-200 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
          </div>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
}
