import Link from 'next/link';
import { cn } from '@/lib/utils';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  hrefBuilder?: (page: number) => string;
  onPageChange?: (page: number) => void;
  className?: string;
};

export function Pagination({
  currentPage,
  totalPages,
  hrefBuilder,
  onPageChange,
  className
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const renderItem = (pageNumber: number) => {
    const isActive = pageNumber === currentPage;
    const commonClassName = cn(
      'rounded-md px-3 py-2 text-sm font-medium transition',
      isActive ? 'bg-primary text-primary-foreground' : 'border bg-background text-slate-700 hover:bg-slate-100'
    );

    if (hrefBuilder) {
      return (
        <Link key={pageNumber} href={hrefBuilder(pageNumber) as any} className={commonClassName} aria-current={isActive ? 'page' : undefined}>
          {pageNumber}
        </Link>
      );
    }

    return (
      <button
        key={pageNumber}
        type="button"
        className={commonClassName}
        onClick={() => onPageChange?.(pageNumber)}
        aria-current={isActive ? 'page' : undefined}
      >
        {pageNumber}
      </button>
    );
  };

  const prevPage = currentPage - 1;
  const nextPage = currentPage + 1;

  const prevDisabled = prevPage < 1;
  const nextDisabled = nextPage > totalPages;

  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      {hrefBuilder ? (
        prevDisabled ? (
          <span className="rounded-md px-3 py-2 text-sm font-medium border bg-background text-slate-400 opacity-50">
            Previous
          </span>
        ) : (
          <Link
            href={hrefBuilder(prevPage) as any}
            className="rounded-md px-3 py-2 text-sm font-medium border bg-background text-slate-700 hover:bg-slate-100"
          >
            Previous
          </Link>
        )
      ) : (
        <button
          type="button"
          className="rounded-md px-3 py-2 text-sm font-medium border bg-background text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
          onClick={() => onPageChange?.(prevPage)}
          disabled={prevDisabled}
        >
          Previous
        </button>
      )}
      {Array.from({ length: totalPages }, (_, index) => index + 1).map(renderItem)}
      {hrefBuilder ? (
        nextDisabled ? (
          <span className="rounded-md px-3 py-2 text-sm font-medium border bg-background text-slate-400 opacity-50">
            Next
          </span>
        ) : (
          <Link
            href={hrefBuilder(nextPage) as any}
            className="rounded-md px-3 py-2 text-sm font-medium border bg-background text-slate-700 hover:bg-slate-100"
          >
            Next
          </Link>
        )
      ) : (
        <button
          type="button"
          className="rounded-md px-3 py-2 text-sm font-medium border bg-background text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
          onClick={() => onPageChange?.(nextPage)}
          disabled={nextDisabled}
        >
          Next
        </button>
      )}
    </div>
  );
}
