'use client';

import { useLocale } from '@/i18n/provider';

type PaginationLabelsProps = {
  variant: 'page-info' | 'previous' | 'next';
  currentPage?: number;
  totalPages?: number;
};

export function PaginationLabels({ variant, currentPage, totalPages }: PaginationLabelsProps) {
  const { dict } = useLocale();

  if (variant === 'page-info') {
    return (
      <span className="text-sm text-muted-foreground font-medium mr-2">
        {dict.common.page} <span className="font-semibold text-foreground">{currentPage}</span> {dict.common.of} <span className="font-semibold text-foreground">{totalPages}</span>
      </span>
    );
  }

  if (variant === 'previous') {
    return <span className="hidden sm:inline">{dict.common.previous}</span>;
  }

  return <span className="hidden sm:inline">{dict.common.next}</span>;
}
