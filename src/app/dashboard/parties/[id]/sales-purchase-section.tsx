'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { DEFAULT_PAGE_SIZE } from '@/config/pagination';
import { DateInput } from '@/components/ui/date-input';
import { formatDateBD as formatDate, toDateInputValueBD as toDateInputValue, todayDateInputValueBD as todayDateStr } from '@/lib/dates';
import { getProductTypeLabel } from '@/lib/product-types';

type ProductRow = {
  id: string;
  transactionId: number;
  invoiceNumber: string;
  transactionDate: Date;
  transactionType: string;
  mediaName: string | null;
  productName: string;
  productType: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  details: string | null;
  totalKg: number;
};

type ProductTypeFilter = 'ALL' | 'FEED' | 'MEDICINE' | 'EGG' | 'CHICKEN' | 'CHICK';

function formatCurrency(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `Tk ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)}`;
}

function printProductRows(title: string, rows: ProductRow[], showTotalKg = false) {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const headerCells = [
    'Date',
    'Media',
    'Product',
    'Type',
    'Quantity',
    'Unit',
    ...(showTotalKg ? ['Total Kg'] : []),
    'Unit Price',
    'Line Total'
  ];

  const bodyRows = rows.map((row) => {
    const cells = [
      formatDate(row.transactionDate),
      row.mediaName ?? '—',
      row.productName,
      getProductTypeLabel(row.productType),
      String(row.quantity),
      row.unit,
      ...(showTotalKg && row.totalKg > 0 ? [row.totalKg.toFixed(2)] : showTotalKg ? [''] : []),
      formatCurrency(row.unitPrice),
      formatCurrency(row.lineTotal)
    ];
    return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
  }).join('');

  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin-bottom: 8px; }
          p { color: #6b7280; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on ${formatDate(new Date())}</p>
        <table>
          <thead>
            <tr>
              ${headerCells.map((cell) => `<th>${cell}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function ProductItemsTable({ title, rows, totalItems, headerActions, showTotalKg = false }: { title: string; rows: ProductRow[]; totalItems?: number; headerActions?: ReactNode; showTotalKg?: boolean }) {
  const itemCount = totalItems ?? rows.length;
  const colSpan = showTotalKg ? 10 : 9;

  return (
    <div className="mt-5 overflow-visible rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-card-title">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          <span className="rounded-full bg-background px-3 py-1 text-badge text-muted-foreground">{itemCount} items</span>
        </div>
      </div>
      <ResponsiveTable minWidth="980px">
        <table className="min-w-full text-table-body">
          <thead className="bg-muted/20 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-table-header">Date</th>
                <th className="px-4 py-3 text-table-header">Media</th>
                <th className="px-4 py-3 text-table-header">Product</th>
                <th className="px-4 py-3 text-table-header">Type</th>
                <th className="px-4 py-3 text-table-header">Quantity</th>
                <th className="px-4 py-3 text-table-header">Unit</th>
                {showTotalKg && (
                  <th className="px-4 py-3 text-table-header">Total Kg</th>
                )}
                <th className="px-4 py-3 text-table-header text-right">Unit Price</th>
                <th className="px-4 py-3 text-table-header text-right">Line Total</th>
                <th className="px-4 py-3 text-table-header">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(row.transactionDate)}</td>
                  <td className="px-4 py-3">{row.mediaName ?? '—'}</td>
                  <td className="min-w-48 px-4 py-3">{row.productName}</td>
                  <td className="px-4 py-3">{getProductTypeLabel(row.productType)}</td>
                  <td className="px-4 py-3 tabular-nums">{row.quantity}</td>
                  <td className="px-4 py-3">{row.unit}</td>
                  {showTotalKg && (
                    <td className="px-4 py-3 tabular-nums">
                      {row.totalKg > 0 ? row.totalKg.toFixed(2) : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(row.lineTotal)}</td>
                  <td className="px-4 py-3">
                    <Button asChild variant="outline" size="icon" className="h-9 w-9">
                      <a
                        href={`/dashboard/transactions/${row.transactionId}/print`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Print transaction"
                        title="Print transaction"
                      >
                        <Printer className="h-4 w-4" />
                      </a>
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
                    No items found for this product type.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>
  );
}

type SalesPurchaseSectionProps = {
  saleRows: ProductRow[];
  buyRows: ProductRow[];
  partyId: number;
};

export function SalesPurchaseSection({ saleRows, buyRows, partyId }: SalesPurchaseSectionProps) {
  const [dateFrom, setDateFrom] = useState(todayDateStr());
  const [dateTo, setDateTo] = useState(todayDateStr());
  const [salesTypeFilter, setSalesTypeFilter] = useState<ProductTypeFilter>('ALL');
  const [salesPage, setSalesPage] = useState(1);
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<ProductTypeFilter>('ALL');
  const [purchasePage, setPurchasePage] = useState(1);

  useEffect(() => {
    setSalesPage(1);
    setPurchasePage(1);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setSalesPage(1);
  }, [salesTypeFilter]);

  useEffect(() => {
    setPurchasePage(1);
  }, [purchaseTypeFilter]);

  const filteredSaleRows = useMemo(() => saleRows.filter((row) => {
    const rowTime = new Date(toDateInputValue(row.transactionDate)).getTime();
    if (dateFrom && rowTime < new Date(dateFrom).getTime()) return false;
    if (dateTo && rowTime > new Date(dateTo).getTime()) return false;
    if (salesTypeFilter === 'ALL') return true;
    return row.productType.toUpperCase() === salesTypeFilter;
  }), [saleRows, salesTypeFilter, dateFrom, dateTo]);

  const filteredBuyRows = useMemo(() => buyRows.filter((row) => {
    const rowTime = new Date(toDateInputValue(row.transactionDate)).getTime();
    if (dateFrom && rowTime < new Date(dateFrom).getTime()) return false;
    if (dateTo && rowTime > new Date(dateTo).getTime()) return false;
    if (purchaseTypeFilter === 'ALL') return true;
    return row.productType.toUpperCase() === purchaseTypeFilter;
  }), [buyRows, purchaseTypeFilter, dateFrom, dateTo]);

  const salePageCount = Math.max(1, Math.ceil(filteredSaleRows.length / DEFAULT_PAGE_SIZE));
  const salesPageSafe = Math.min(Math.max(salesPage, 1), salePageCount);
  const visibleSaleRows = filteredSaleRows.slice((salesPageSafe - 1) * DEFAULT_PAGE_SIZE, salesPageSafe * DEFAULT_PAGE_SIZE);

  const purchasePageCount = Math.max(1, Math.ceil(filteredBuyRows.length / DEFAULT_PAGE_SIZE));
  const purchasePageSafe = Math.min(Math.max(purchasePage, 1), purchasePageCount);
  const visibleBuyRows = filteredBuyRows.slice((purchasePageSafe - 1) * DEFAULT_PAGE_SIZE, purchasePageSafe * DEFAULT_PAGE_SIZE);

  return (
    <>
      <div className="mb-6">
        <ProductItemsTable
          title="Sales Items"
          rows={visibleSaleRows}
          totalItems={filteredSaleRows.length}
          headerActions={(
            <>
              <div className="flex flex-col gap-1">
                <DateInput
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Sales start date"
                />
              </div>
              <div className="flex flex-col gap-1">
                <DateInput
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Sales end date"
                />
              </div>
              <label htmlFor="salesProductTypeFilter" className="text-sm font-medium text-muted-foreground">
                Product type
              </label>
              <select
                id="salesProductTypeFilter"
                value={salesTypeFilter}
                onChange={(event) => setSalesTypeFilter(event.target.value as ProductTypeFilter)}
                className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">All</option>
                <option value="FEED">Feeds</option>
                <option value="MEDICINE">Medicine</option>
                <option value="CHICK">Hatchling / Chick</option>
              </select>
              <Button type="button" variant="outline" className="h-[42px]" onClick={() => printProductRows('Sales Items', filteredSaleRows, false)}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </>
          )}
          showTotalKg={false}
        />
        {salePageCount > 1 && (
          <div className="mt-4 flex items-center justify-end">
            <Pagination currentPage={salesPageSafe} totalPages={salePageCount} onPageChange={setSalesPage} />
          </div>
        )}
      </div>

      <div className="mb-6">
        <ProductItemsTable
          title="Purchase Items"
          rows={visibleBuyRows}
          totalItems={filteredBuyRows.length}
          headerActions={(
            <>
              <div className="flex flex-col gap-1">
                <DateInput
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Purchase start date"
                />
              </div>
              <div className="flex flex-col gap-1">
                <DateInput
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Purchase end date"
                />
              </div>
              <label htmlFor="purchaseProductTypeFilter" className="text-sm font-medium text-muted-foreground">
                Product type
              </label>
              <select
                id="purchaseProductTypeFilter"
                value={purchaseTypeFilter}
                onChange={(event) => setPurchaseTypeFilter(event.target.value as ProductTypeFilter)}
                className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">All</option>
                <option value="EGG">Egg</option>
                <option value="CHICKEN">Chicken</option>
                <option value="CHICK">Hatchling / Chick</option>
              </select>
              <Button type="button" variant="outline" className="h-[42px]" onClick={() => printProductRows('Purchase Items', filteredBuyRows, true)}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </>
          )}
          showTotalKg={true}
        />
        {purchasePageCount > 1 && (
          <div className="mt-4 flex items-center justify-end">
            <Pagination currentPage={purchasePageSafe} totalPages={purchasePageCount} onPageChange={setPurchasePage} />
          </div>
        )}
      </div>
    </>
  );
}
