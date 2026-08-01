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
  className?: string;
  valueColor?: string;
}

export function SummaryCard({
  title,
  value,
  metric,
  metricColor,
  icon: Icon,
  accent,
  className,
  valueColor = 'text-slate-950'
}: SummaryCardProps) {
  return (
    <Card className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-card-title text-muted-foreground">{title}</p>
          <p className={`mt-2 text-card-title ${valueColor}`}>{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className={`mt-3 text-sm font-medium ${metricColor}`}>{metric}</p>
    </Card>
  );
}
