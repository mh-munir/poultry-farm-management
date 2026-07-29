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
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-form-label text-muted-foreground">{title}</p>
          <p className="mt-2 text-card-title text-slate-950">{value}</p>
          {description ? <p className="mt-3 text-sm font-medium text-slate-600">{description}</p> : null}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
