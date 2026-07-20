import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface FilterCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterCard({ title, description, children, className }: FilterCardProps) {
  return (
    <Card className={cn('rounded-3xl border-slate-200 bg-background p-6 shadow-sm', className)}>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}
