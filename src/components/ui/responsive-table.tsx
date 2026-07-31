import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ResponsiveTableProps = {
  children: ReactNode;
  className?: string;
  minWidth?: string;
  stickyLastColumn?: boolean;
};

export function ResponsiveTable({
  children,
  className,
  minWidth = '760px',
  stickyLastColumn = false
}: ResponsiveTableProps) {
  return (
    <div
      className={cn(
        'responsive-table-container',
        stickyLastColumn && 'responsive-table-container--sticky-last',
        className
      )}
      style={{ '--responsive-table-min-width': minWidth } as CSSProperties}
    >
      {children}
    </div>
  );
}
