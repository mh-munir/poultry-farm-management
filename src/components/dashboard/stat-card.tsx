import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accent: string;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, accent, description, className }: StatCardProps) {
  return (
    <Card className={cn('rounded-3xl border border-slate-200 bg-background p-5 shadow-sm transition duration-200 hover:-translate-y-[1px] hover:shadow-lg', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
