import { Children, cloneElement, isValidElement, type CSSProperties, type ReactNode, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

type ResponsiveTableProps = {
  children: ReactNode;
  className?: string;
  minWidth?: string;
  stickyLastColumn?: boolean;
};

type TableElementProps = {
  children?: ReactNode;
  className?: string;
  [key: string]: any;
};

type ReactTableElement = ReactElement<TableElementProps>;

type DataTableCellProps = {
  children: ReactNode;
  label?: string;
  className?: string;
};

export function ResponsiveTable({
  children,
  className,
  minWidth = '760px',
  stickyLastColumn = false
}: ResponsiveTableProps) {
  const isTableElement = (node: ReactNode, type?: string): node is ReactTableElement =>
    isValidElement(node) && (type ? node.type === type : typeof node.type === 'string');

  const getHeaderLabels = (table: ReactTableElement): string[] => {
    const tableChildren = Children.toArray(table.props.children);
    const thead = tableChildren.find(
      (node): node is ReactTableElement => isValidElement(node) && node.type === 'thead'
    );
    const headerRow = thead
      ? Children.toArray(thead.props.children).find(
          (row): row is ReactTableElement => isValidElement(row) && row.type === 'tr'
        )
      : tableChildren.find(
          (node): node is ReactTableElement => isValidElement(node) && node.type === 'tr'
        );

    if (!headerRow) {
      return [];
    }

    return Children.toArray(headerRow.props.children)
      .filter((cell): cell is ReactTableElement => isValidElement(cell) && (cell.type === 'th' || cell.type === 'td'))
      .map((cell) => {
        const cellElement = cell as ReactTableElement;
        return Children.toArray(cellElement.props.children)
          .map((child) => (typeof child === 'string' || typeof child === 'number' ? child : ''))
          .join('')
          .trim();
      });
  };

  const enhanceRow = (row: ReactTableElement, labels: string[]) =>
    cloneElement(row, {
      children: Children.map(row.props.children, (cell, index) => {
        if (!isValidElement(cell)) {
          return cell;
        }

        const cellElement = cell as ReactTableElement;
        if (cellElement.type !== 'td') {
          return cellElement;
        }

        const isFullRow = Boolean(cellElement.props.colSpan);

        return cloneElement(cellElement, {
          'data-label': isFullRow ? '' : cellElement.props['data-label'] ?? labels[index] ?? '',
          'data-full-row': isFullRow ? 'true' : cellElement.props['data-full-row']
        });
      })
    });

  const enhanceTable = (table: ReactTableElement) => {
    const labels = getHeaderLabels(table);

    const childrenWithLabels = Children.map(table.props.children, (section) => {
      if (!isValidElement(section)) {
        return section;
      }

      if (section.type === 'tbody' || section.type === 'tfoot') {
        return cloneElement(section as ReactTableElement, {
          children: Children.map((section as ReactTableElement).props.children, (row) => {
            if (!isValidElement(row) || row.type !== 'tr') {
              return row;
            }
            return enhanceRow(row as ReactTableElement, labels);
          })
        });
      }

      if (section.type === 'tr') {
        return enhanceRow(section as ReactTableElement, labels);
      }

      return section;
    });

    return cloneElement(table, {
      className: cn(
        (table as ReactTableElement).props.className,
        'data-table w-full border-separate border-spacing-0 text-left',
        stickyLastColumn && 'sticky-last-column'
      ),
      children: childrenWithLabels
    });
  };

  const enhanceNode = (node: ReactNode): ReactNode => {
    if (!isTableElement(node)) {
      return node;
    }

    if (node.type === 'table') {
      return enhanceTable(node);
    }

    if (!node.props.children) {
      return node;
    }

    return cloneElement(node, {
      children: Children.map(node.props.children, enhanceNode)
    });
  };

  const enhancedChildren = Children.map(children, enhanceNode);

  return (
    <div
      className={cn(
        'responsive-data-table relative isolate w-full min-w-0 overflow-x-auto lg:overflow-x-visible overflow-y-visible overscroll-x-contain [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]',
        className
      )}
      style={{ '--data-table-min-width': minWidth } as CSSProperties}
    >
      <div className="min-w-full lg:min-w-[var(--data-table-min-width)]">
        {enhancedChildren}
      </div>
    </div>
  );
}

export function DataTable({
  children,
  className,
  minWidth = '760px',
  stickyLastColumn = false
}: ResponsiveTableProps) {
  return (
    <ResponsiveTable minWidth={minWidth} className={className} stickyLastColumn={stickyLastColumn}>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <table
          className={cn(
            'data-table w-full border-separate border-spacing-0 text-left',
            stickyLastColumn && 'sticky-last-column'
          )}
        >
          {children}
        </table>
      </div>
    </ResponsiveTable>
  );
}

export function DataTableHeadCell({ children, className }: DataTableCellProps) {
  return (
    <th className={cn('px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600', className)}>
      {children}
    </th>
  );
}

export function DataTableCell({ children, label, className }: DataTableCellProps) {
  return (
    <td data-label={label} className={cn('px-4 py-3 text-sm text-slate-700 align-top', className)}>
      {children}
    </td>
  );
}

export const Table = DataTable;
export const DataTableFoot = ({ children, className }: { children: ReactNode; className?: string }) => (
  <tfoot className={cn(className)}>{children}</tfoot>
);

export const ResponsiveDataTable = DataTable;
