'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, Pencil, Printer, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { DEFAULT_PAGE_SIZE } from '@/config/pagination';
import { DateInput } from '@/components/ui/date-input';
import { Dialog } from '@/components/ui/dialog';
import { toDateInputValueBD as toDateInputValue } from '@/lib/dates';
import { useLocale } from '@/i18n/provider';
import { deletePartyTransaction, updatePurchaseItem } from '@/features/purchases/actions';
import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedNumber } from '@/lib/localized-formatters';
import { localizeProductText } from '@/i18n/display';
import { useToast } from '@/hooks/use-toast';

type ProductRow = {
  id: string;
  itemId: number;
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
  discount: number;
  lineTotal: number;
  details: string | null;
  totalKg: number;
  productId: number;
};

type ProductTypeFilter = 'ALL' | 'FEED' | 'MEDICINE' | 'EGG' | 'CHICKEN' | 'CHICK';

function formatCurrency(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `Tk ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)}`;
}

function parseDateInputValue(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getInclusiveToDate(value: string | null | undefined) {
  const start = parseDateInputValue(value);
  if (!start) return null;
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
}

function openTransactionPrint(transactionId: number) {
  window.open(`/dashboard/transactions/${transactionId}/print`, '_blank');
}

function RowActionsMenu({ row, onEdit, onDelete, onPrint }: { row: ProductRow; onEdit?: (row: ProductRow) => void; onDelete?: (row: ProductRow) => void; onPrint?: (row: ProductRow) => void; }) {
  const [open, setOpen] = useState(false);
  const { dict } = useLocale();

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Row actions"
          className="h-8 w-8 rounded-md border border-slate-200 bg-white p-0 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-[200] w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/25"
        >
          <DropdownMenu.Item
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-slate-700 outline-none transition hover:bg-slate-100 focus:bg-slate-100 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
            onSelect={() => {
              onEdit?.(row);
              setOpen(false);
            }}
          >
            <Pencil className="h-4 w-4" />
            {dict.common.edit}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-destructive outline-none transition hover:bg-destructive/10 focus:bg-destructive/10 data-[highlighted]:bg-destructive/10"
            onSelect={() => {
              onDelete?.(row);
              setOpen(false);
            }}
          >
            <Trash2 className="h-4 w-4" />
            {dict.common.delete}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-slate-700 outline-none transition hover:bg-slate-100 focus:bg-slate-100 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800 dark:data-[highlighted]:bg-slate-800"
            onSelect={() => {
              onPrint?.(row);
              setOpen(false);
            }}
          >
            <Printer className="h-4 w-4" />
            {dict.common.print}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ProductItemsTable({ title, rows, totalItems, headerActions, showTotalKg = false, summary, onEdit, onDelete, onPrint }: { title: string; rows: ProductRow[]; totalItems?: number; headerActions?: ReactNode; showTotalKg?: boolean; summary?: { quantity: number; totalKg: number; lineTotal: number }; onEdit?: (row: ProductRow) => void; onDelete?: (row: ProductRow) => void; onPrint?: (row: ProductRow) => void; }) {
  const itemCount = totalItems ?? rows.length;
  const colSpan = showTotalKg ? 8 : 7;
  const { dict, locale } = useLocale();

  return (
    <div className="mt-5 overflow-visible rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-card-title">{title}</h3>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">{formatLocalizedNumber(itemCount, locale)} {dict.common.product}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
        </div>
      </div>
      <ResponsiveTable minWidth="900px">
        <table className="min-w-full text-table-body">
          <thead className="bg-muted/20 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-table-header">{dict.common.date}</th>
              <th className="px-4 py-3 text-table-header">{dict.tableHeaders.media ?? 'Media'}</th>
              <th className="px-4 py-3 text-table-header">{dict.common.productName}</th>
              <th className="px-4 py-3 text-table-header text-right">{dict.common.quantity}</th>
              {showTotalKg && (
                <th className="px-4 py-3 text-table-header text-right">{dict.tableHeaders.totalKg ?? 'Total Kg'}</th>
              )}
              <th className="px-4 py-3 text-table-header text-right">{dict.tableHeaders.unitPrice ?? 'Unit Price'}</th>
              <th className="px-4 py-3 text-table-header text-right">{dict.tableHeaders.lineTotal ?? 'Line Total'}</th>
              <th className="px-4 py-3 text-table-header text-right">{dict.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((row) => (
              <tr key={row.id} className="border-t border-border transition-colors hover:bg-muted/20">
                <td className="whitespace-nowrap px-4 py-3">{formatLocalizedDate(row.transactionDate, locale)}</td>
                <td className="px-4 py-3">{row.mediaName ?? '—'}</td>
                <td className="min-w-48 px-4 py-3">{localizeProductText(row.productName, locale)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatLocalizedNumber(row.quantity, locale)}</td>
                {showTotalKg && (
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.totalKg > 0 ? (locale === 'bn' ? `${formatLocalizedCurrency(row.totalKg, locale).replace('৳ ', '')}` : row.totalKg.toFixed(2)) : '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-right tabular-nums">{formatLocalizedCurrency(row.unitPrice, locale)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatLocalizedCurrency(row.lineTotal, locale)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <RowActionsMenu row={row} onEdit={onEdit} onDelete={onDelete} onPrint={onPrint} />
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
                  {dict.common.noData}
                </td>
              </tr>
            )}
          </tbody>
          {summary && rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-muted/20 font-semibold">
                <td className="px-4 py-3 text-left" colSpan={showTotalKg ? 3 : 2}>{dict.common.total}</td>
                <td className="px-4 py-3 text-right tabular-nums">{summary.quantity}</td>
                {showTotalKg && (
                  <td className="px-4 py-3 text-right tabular-nums">{summary.totalKg.toFixed(2)} kg</td>
                )}
                <td className="px-4 py-3 text-right">&nbsp;</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(summary.lineTotal)}</td>
                <td className="px-4 py-3 text-right">&nbsp;</td>
              </tr>
            </tfoot>
          )}
        </table>
      </ResponsiveTable>
    </div>
  );
}

type SalesPurchaseSectionProps = {
  partyId: number;
  saleRows: ProductRow[];
  buyRows: ProductRow[];
};

export function SalesPurchaseSection({ partyId, saleRows, buyRows }: SalesPurchaseSectionProps) {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [salesTypeFilter, setSalesTypeFilter] = useState<ProductTypeFilter>('ALL');
  const [salesPage, setSalesPage] = useState(1);
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<ProductTypeFilter>('ALL');
  const [purchasePage, setPurchasePage] = useState(1);
  const [editingRow, setEditingRow] = useState<ProductRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<ProductRow | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  const [itemError, setItemError] = useState('');
  const [itemForm, setItemForm] = useState({
    productId: 0,
    productName: '',
    quantity: '0',
    totalKg: '0',
    unitPrice: '0',
    discount: '0',
    transactionDate: '',
  });
  const { dict } = useLocale();
  const { success, error: showToastError } = useToast();

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
    const rowDate = parseDateInputValue(toDateInputValue(row.transactionDate));
    if (!rowDate) return false;
    const fromDate = parseDateInputValue(dateFrom);
    const toDate = getInclusiveToDate(dateTo);
    if (fromDate && rowDate.getTime() < fromDate.getTime()) return false;
    if (toDate && rowDate.getTime() > toDate.getTime()) return false;
    if (salesTypeFilter === 'ALL') return true;
    return row.productType.toUpperCase() === salesTypeFilter;
  }), [saleRows, salesTypeFilter, dateFrom, dateTo]);

  const filteredBuyRows = useMemo(() => buyRows.filter((row) => {
    const rowDate = parseDateInputValue(toDateInputValue(row.transactionDate));
    if (!rowDate) return false;
    const fromDate = parseDateInputValue(dateFrom);
    const toDate = getInclusiveToDate(dateTo);
    if (fromDate && rowDate.getTime() < fromDate.getTime()) return false;
    if (toDate && rowDate.getTime() > toDate.getTime()) return false;
    if (purchaseTypeFilter === 'ALL') return true;
    return row.productType.toUpperCase() === purchaseTypeFilter;
  }), [buyRows, purchaseTypeFilter, dateFrom, dateTo]);

  const purchaseSummary = useMemo(() => filteredBuyRows.reduce((summary, row) => ({
    quantity: summary.quantity + Number(row.quantity ?? 0),
    totalKg: summary.totalKg + Number(row.totalKg ?? 0),
    lineTotal: summary.lineTotal + Number(row.lineTotal ?? 0)
  }), { quantity: 0, totalKg: 0, lineTotal: 0 }), [filteredBuyRows]);

  const salePageCount = Math.max(1, Math.ceil(filteredSaleRows.length / DEFAULT_PAGE_SIZE));
  const salesPageSafe = Math.min(Math.max(salesPage, 1), salePageCount);
  const visibleSaleRows = filteredSaleRows.slice((salesPageSafe - 1) * DEFAULT_PAGE_SIZE, salesPageSafe * DEFAULT_PAGE_SIZE);

  const purchasePageCount = Math.max(1, Math.ceil(filteredBuyRows.length / DEFAULT_PAGE_SIZE));
  const purchasePageSafe = Math.min(Math.max(purchasePage, 1), purchasePageCount);
  const visibleBuyRows = filteredBuyRows.slice((purchasePageSafe - 1) * DEFAULT_PAGE_SIZE, purchasePageSafe * DEFAULT_PAGE_SIZE);

  const openEditDialog = (row: ProductRow) => {
    setItemError('');
    setEditingRow(row);
    setItemForm({
      productId: row.productId,
      productName: row.productName,
      quantity: String(row.quantity),
      totalKg: String(row.totalKg ?? 0),
      unitPrice: String(row.unitPrice ?? 0),
      discount: String(row.discount ?? 0),
      transactionDate: toDateInputValue(row.transactionDate)
    });
  };

  const isChickenItem = editingRow?.productType === 'CHICKEN';
  const billableQuantity = isChickenItem ? Number(itemForm.totalKg || 0) : Number(itemForm.quantity || 0);
  const computedLineSubtotal = billableQuantity * Number(itemForm.unitPrice || 0);
  const computedLineDiscount = Math.max(0, Math.min(Number(itemForm.discount || 0), computedLineSubtotal));
  const computedLineTotal = Math.max(0, computedLineSubtotal - computedLineDiscount);

  const handleSavePurchaseItem = async () => {
    if (!editingRow) return;

    const quantity = Number(itemForm.quantity);
    const totalKg = Number(itemForm.totalKg);
    const unitPrice = Number(itemForm.unitPrice);
    const discount = Number(itemForm.discount);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setItemError('Quantity must be greater than zero.');
      return;
    }

    if (!Number.isFinite(totalKg) || totalKg < 0) {
      setItemError('Total Kg cannot be negative.');
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setItemError('Per Kg Price cannot be negative.');
      return;
    }

    if (!Number.isFinite(discount) || discount < 0) {
      setItemError('Discount cannot be negative.');
      return;
    }

    const gross = editingRow.productType === 'CHICKEN'
      ? (totalKg > 0 ? totalKg * unitPrice : 0)
      : quantity * unitPrice;
    if (discount > gross) {
      setItemError('Discount cannot exceed the item subtotal.');
      return;
    }

    const formData = new FormData();
    formData.set('itemId', String(editingRow.itemId));
    formData.set('productId', String(itemForm.productId || editingRow.productId));
    formData.set('quantity', String(quantity));
    formData.set('totalKg', String(totalKg));
    formData.set('unitPrice', String(unitPrice));
    formData.set('discount', String(discount));
    formData.set('transactionDate', itemForm.transactionDate || toDateInputValue(editingRow.transactionDate));

    setIsSavingItem(true);
    setItemError('');

    try {
      const result = await updatePurchaseItem(formData);
      if (!result.success) {
        setItemError(result.message);
        return;
      }
      setEditingRow(null);
      router.refresh();
    } catch (error) {
      setItemError(error instanceof Error ? error.message : 'Failed to update purchase item.');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deletingRow || (deletingRow.transactionType !== 'SALE' && deletingRow.transactionType !== 'PURCHASE')) {
      return;
    }

    setIsDeletingTransaction(true);
    try {
      const result = await deletePartyTransaction(
        deletingRow.transactionId,
        partyId,
        deletingRow.transactionType
      );
      if (!result.success) {
        showToastError(result.message);
        return;
      }

      success(result.message);
      setDeletingRow(null);
      router.refresh();
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Failed to delete the transaction.');
    } finally {
      setIsDeletingTransaction(false);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={Boolean(deletingRow)}
        onOpenChange={(open) => {
          if (!open && !isDeletingTransaction) setDeletingRow(null);
        }}
        title={dict.common.deleteTransactionTitle}
        description={dict.common.deleteTransactionDescription.replace('{invoice}', deletingRow?.invoiceNumber ?? '')}
        confirmText={dict.common.delete}
        onConfirm={handleDeleteTransaction}
        isLoading={isDeletingTransaction}
      />
      <div className="mb-6">
        <ProductItemsTable
          title={`${dict.common.sales} ${dict.common.product}`}
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
                {dict.common.type}
              </label>
              <select
                id="salesProductTypeFilter"
                value={salesTypeFilter}
                onChange={(event) => setSalesTypeFilter(event.target.value as ProductTypeFilter)}
                className="form-select"
              >
                <option value="ALL">{dict.common.all}</option>
                <option value="FEED">{dict.productTypes.feeds}</option>
                <option value="MEDICINE">{dict.productTypes.medicine}</option>
                <option value="CHICK">{dict.productTypes.chick}</option>
              </select>
              <Button type="button" variant="outline" className="h-[42px]" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                {dict.common.clear}
              </Button>
              <Button type="button" variant="outline" className="h-[42px]" onClick={() => {
                const rows = filteredSaleRows;
                if (rows.length > 0) openTransactionPrint(rows[0].transactionId);
              }}>
                <Printer className="mr-2 h-4 w-4" />
                {dict.common.print}
              </Button>
            </>
          )}
          showTotalKg={false}
          onDelete={setDeletingRow}
          onPrint={(row) => openTransactionPrint(row.transactionId)}
        />
        {salePageCount > 1 && (
          <div className="mt-4 flex items-center justify-end">
            <Pagination currentPage={salesPageSafe} totalPages={salePageCount} onPageChange={setSalesPage} />
          </div>
        )}
      </div>

      <div className="mb-6">
        <ProductItemsTable
          title={`${dict.common.purchases} ${dict.common.product}`}
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
                {dict.common.type}
              </label>
              <select
                id="purchaseProductTypeFilter"
                value={purchaseTypeFilter}
                onChange={(event) => setPurchaseTypeFilter(event.target.value as ProductTypeFilter)}
                className="form-select"
              >
                <option value="ALL">{dict.common.all}</option>
                <option value="EGG">{dict.productTypes.egg}</option>
                <option value="CHICKEN">{dict.productTypes.chicken}</option>
                <option value="CHICK">{dict.productTypes.chick}</option>
              </select>
              <Button type="button" variant="outline" className="h-[42px]" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                {dict.common.clear}
              </Button>
              <Button type="button" variant="outline" className="h-[42px]" onClick={() => {
                const rows = filteredBuyRows;
                if (rows.length > 0) openTransactionPrint(rows[0].transactionId);
              }}>
                <Printer className="mr-2 h-4 w-4" />
                {dict.common.print}
              </Button>
            </>
          )}
          showTotalKg={true}
          summary={purchaseSummary}
          onEdit={openEditDialog}
          onDelete={setDeletingRow}
          onPrint={(row) => openTransactionPrint(row.transactionId)}
        />
        {purchasePageCount > 1 && (
          <div className="mt-4 flex items-center justify-end">
            <Pagination currentPage={purchasePageSafe} totalPages={purchasePageCount} onPageChange={setPurchasePage} />
          </div>
        )}
      </div>
      {editingRow && (
        <Dialog
          open={Boolean(editingRow)}
          onOpenChange={(open) => !open && setEditingRow(null)}
          title={`${dict.common.edit} ${dict.common.purchases} ${dict.common.product}`}
          footer={(
            <>
              <Button type="button" variant="outline" onClick={() => setEditingRow(null)} disabled={isSavingItem}>
                {dict.common.cancel}
              </Button>
              <Button type="button" onClick={handleSavePurchaseItem} disabled={isSavingItem}>
                {isSavingItem ? dict.common.processing : dict.stock.saveChanges}
              </Button>
            </>
          )}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium">{dict.common.productName}</label>
              <input
                value={itemForm.productName}
                onChange={(event) => setItemForm((prev) => ({ ...prev, productName: event.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                readOnly
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">{dict.common.date}</label>
              <DateInput
                value={itemForm.transactionDate}
                onChange={(event) => setItemForm((prev) => ({ ...prev, transactionDate: event.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">{dict.common.quantity}</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={itemForm.quantity}
                onChange={(event) => setItemForm((prev) => ({ ...prev, quantity: event.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">{dict.tableHeaders.totalKg ?? 'Total Kg'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={itemForm.totalKg}
                onChange={(event) => setItemForm((prev) => ({ ...prev, totalKg: event.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">{dict.tableHeaders.unitPrice ?? 'Per Kg Price'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={itemForm.unitPrice}
                onChange={(event) => setItemForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">{dict.forms.discount ?? 'Discount'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={itemForm.discount}
                onChange={(event) => setItemForm((prev) => ({ ...prev, discount: event.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="md:col-span-2 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between text-sm">
                <span>{dict.tableHeaders.lineTotal ?? 'Line Total'}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(computedLineTotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{dict.forms.discount ?? 'Discount'}</span>
                <span className="tabular-nums">{formatCurrency(computedLineDiscount)}</span>
              </div>
            </div>

            {itemError ? (
              <div className="md:col-span-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {itemError}
              </div>
            ) : null}
          </div>
        </Dialog>
      )}
    </>
  );
}
