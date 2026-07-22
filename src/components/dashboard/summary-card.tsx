import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SummaryCardProps {
  title: string;
  value: string;
  metric: string;
  metricColor: string;
  icon: LucideIcon;
  accent: string;
}

export function SummaryCard({
  title,
  value,
  metric,
  metricColor,
  icon: Icon,
  accent
}: SummaryCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className={`mt-4 text-sm font-medium ${metricColor}`}>{metric}</p>
    </Card>
  );
}
