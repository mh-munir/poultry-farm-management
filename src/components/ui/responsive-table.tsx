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
        'relative isolate w-full min-w-0 overflow-x-auto lg:overflow-x-visible overflow-y-visible overscroll-x-contain [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]',
        stickyLastColumn && 'lg:[&_th:last-child]:sticky lg:[&_td:last-child]:sticky lg:[&_th:last-child]:right-0 lg:[&_td:last-child]:right-0 lg:[&_th:last-child]:z-[60] lg:[&_td:last-child]:z-[60] lg:[&_th:last-child]:bg-card lg:[&_td:last-child]:bg-card lg:[&_th:last-child]:shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.45)]',
        className
      )}
      style={{ '--responsive-table-min-width': minWidth } as CSSProperties}
    >
      <div className="min-w-[var(--responsive-table-min-width)]">
        {children}
      </div>
    </div>
  );
}
