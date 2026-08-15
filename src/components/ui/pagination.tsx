import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaginationLabels } from '@/components/ui/pagination-labels';

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
      'inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-all duration-200',
      isActive 
        ? 'bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-md hover:shadow-lg' 
        : 'border border-border bg-background text-foreground hover:bg-muted hover:border-primary/30 hover:shadow-sm'
    );

    if (hrefBuilder) {
      return (
        <Link 
          key={pageNumber} 
          href={hrefBuilder(pageNumber) as any} 
          className={commonClassName} 
          aria-current={isActive ? 'page' : undefined}
        >
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

  const navButtonClass = (disabled: boolean) => cn(
    'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-200',
    disabled
      ? 'border border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50'
      : 'border border-border bg-background text-foreground hover:bg-muted hover:border-primary/30 hover:shadow-sm hover:text-primary'
  );

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-2 sm:justify-end', className)}>
      {/* Page Info */}
      <PaginationLabels variant="page-info" currentPage={currentPage} totalPages={totalPages} />
      
      {/* Previous Button */}
      {hrefBuilder ? (
        prevDisabled ? (
          <div className={navButtonClass(true)}>
            <ChevronLeft className="h-4 w-4" />
            <PaginationLabels variant="previous" />
          </div>
        ) : (
          <Link
            href={hrefBuilder(prevPage) as any}
            className={navButtonClass(false)}
          >
            <ChevronLeft className="h-4 w-4" />
            <PaginationLabels variant="previous" />
          </Link>
        )
      ) : (
        <button
          type="button"
          className={navButtonClass(prevDisabled)}
          onClick={() => onPageChange?.(prevPage)}
          disabled={prevDisabled}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <PaginationLabels variant="previous" />
        </button>
      )}
      
      {/* Page Numbers */}
      <div className="flex max-w-full gap-1 overflow-x-auto overscroll-x-contain">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(renderItem)}
      </div>
      
      {/* Next Button */}
      {hrefBuilder ? (
        nextDisabled ? (
          <div className={navButtonClass(true)}>
            <PaginationLabels variant="next" />
            <ChevronRight className="h-4 w-4" />
          </div>
        ) : (
          <Link
            href={hrefBuilder(nextPage) as any}
            className={navButtonClass(false)}
          >
            <PaginationLabels variant="next" />
            <ChevronRight className="h-4 w-4" />
          </Link>
        )
      ) : (
        <button
          type="button"
          className={navButtonClass(nextDisabled)}
          onClick={() => onPageChange?.(nextPage)}
          disabled={nextDisabled}
          aria-label="Next page"
        >
          <PaginationLabels variant="next" />
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
