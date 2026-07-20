import * as React from 'react';

interface RevenueSourceCardProps {
  label: string;
  revenue: string;
  value: string;
}

export function RevenueSourceCard({ label, revenue, value }: RevenueSourceCardProps) {
  return (
    <div className="rounded-lg border bg-white/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">Revenue</p>
        </div>
        <span className="text-sm font-semibold text-slate-900">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-primary" style={{ width: value }} />
      </div>
      <p className="mt-2 text-sm text-slate-500">{revenue}</p>
    </div>
  );
}
