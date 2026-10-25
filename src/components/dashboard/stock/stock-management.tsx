'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { deleteStockItem, updateStockItem } from '@/features/stock/actions';
import { getCompaniesByType } from '@/features/companies/actions';
import { createCompanyStockPurchaseTransaction } from '@/features/purchases/actions';
import { useToast } from '@/hooks/use-toast';
import { DateInput } from '@/components/ui/date-input';
import { todayDateInputValueBD as todayDateStr, formatDateBD } from '@/lib/dates';
import { useLocale } from '@/i18n/provider';

export interface StockItem {
  id?: number;
  name: string;
  quantity: number;
  buyRate: number;
  salesRate: number;
  unit?: string | null;
  productType?: string;
  companyId?: number | null;
  lastTransactionDate?: Date | string | null;
  companyName?: string | null;
  paidAmount?: number;
  dueAmount?: number;
}

interface PartyOption {
  id: number;
  name: string;
}

interface StockManagementProps {
  title: string;
  description: string;
  addButtonLabel: string;
  initialItems: StockItem[];
  availableProducts: StockItem[];
  suppliers: PartyOption[];
  companyNames?: ComboboxOption[];
  useCompanySearch?: boolean;
  allowCreateCompany?: boolean;
  allowDeleteHistory?: boolean;
  createNewLabel?: string;
  asSection?: boolean;
  showAddButton?: boolean;
  defaultCompanyName?: string;
  defaultCompanyId?: number;
  stockType?: 'FEED' | 'MEDICINE' | 'CHICK';
}

interface StockRow {
  rowId: number;
  productId: string;
  productName: string;
  quantity: string;
  buyRate: string;
  unit?: string;
}

export function StockManagement({
  title,
  description,
  addButtonLabel,
  initialItems,
  availableProducts,
  suppliers,
  companyNames,
  useCompanySearch,
  allowCreateCompany,
  allowDeleteHistory = false,
  createNewLabel,
  asSection = false,
  showAddButton = true,
  defaultCompanyName = '',
  defaultCompanyId,
  stockType: stockTypeProp,
}: StockManagementProps) {
  const { dict } = useLocale();
  const stockType = stockTypeProp ?? (title === 'Medicine' ? 'MEDICINE' : title === 'Hatchling / Chick' ? 'CHICK' : 'FEED');
  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [openActionRowId, setOpenActionRowId] = useState<number | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCompanyId, setEditCompanyId] = useState<number | null>(null);
  const [editCompanies, setEditCompanies] = useState<PartyOption[]>(suppliers);
  const [editCompanyOptions, setEditCompanyOptions] = useState<ComboboxOption[]>(companyNames ?? []);
  const [isLoadingEditCompanies, setIsLoadingEditCompanies] = useState(false);
  const [editCompanyLoadError, setEditCompanyLoadError] = useState<string | null>(null);
  const [editBuyRate, setEditBuyRate] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [partyId, setPartyId] = useState<number>(defaultCompanyId ?? 0);
  const [partyName, setPartyName] = useState<string>(defaultCompanyName);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [companyDiscount, setCompanyDiscount] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => todayDateStr());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rows, setRows] = useState<StockRow[]>([{ rowId: 1, productId: '', productName: '', quantity: '', buyRate: '', unit: '' }]);
  const router = useRouter();
  const { success, error: showToastError } = useToast();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setEditCompanies(suppliers);
    setEditCompanyOptions(companyNames ?? []);
  }, [companyNames, suppliers]);

  useEffect(() => {
    if (defaultCompanyName) {
      setPartyName(defaultCompanyName);
    }
    if (typeof defaultCompanyId === 'number') {
      setPartyId(defaultCompanyId);
    }
  }, [defaultCompanyId, defaultCompanyName]);

  const productVariantLabel = stockType === 'MEDICINE' ? 'Gram / Weight' : 'Unit';

  const totalStockValue = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity * item.buyRate, 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => {
      const quantity = Number(row.quantity) || 0;
      const buyRate = Number(row.buyRate) || 0;
      return sum + quantity * buyRate;
    }, 0);
  }, [rows]);

  const discountedTotalAmount = useMemo(() => {
    const discount = Number(companyDiscount) || 0;
    return Math.max(0, totalAmount - discount);
  }, [companyDiscount, totalAmount]);

  const dueAmount = useMemo(() => {
    const payment = Number(paymentAmount) || 0;
    return Math.max(0, discountedTotalAmount - payment);
  }, [paymentAmount, discountedTotalAmount]);

  const updateRow = useCallback((rowId: number, field: keyof StockRow, value: string) => {
    setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', unit: stockType === 'MEDICINE' ? 'gm' : stockType === 'CHICK' ? 'pcs' : 'bag' }]);
  }, [stockType]);

  const openForm = useCallback(() => {
    if (stockType === 'MEDICINE') {
      setRows([{ rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', unit: 'gm' }]);
    } else if (stockType === 'CHICK') {
      setRows([{ rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', unit: 'pcs' }]);
    } else {
      setRows([{ rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', unit: 'bag' }]);
    }
    setIsFormOpen(true);
  }, [stockType]);

  const openEditModal = useCallback(async (item: StockItem) => {
    setEditingItemId(item.id ?? null);
    setEditProductName(item.name ?? '');

    setEditCompanyId(item.companyId ?? null);
    setEditCompanyName(item.companyName ?? '');
    setEditBuyRate(String(item.buyRate ?? '0'));
    setEditQuantity(String(item.quantity ?? '0'));
    setEditUnit(String(item.unit ?? (stockType === 'MEDICINE' ? 'gm' : stockType === 'CHICK' ? 'pcs' : 'bag')));
    setIsEditModalOpen(true);
    setIsLoadingEditCompanies(true);
    setEditCompanyLoadError(null);

    try {
      const companies = await getCompaniesByType(stockType);
      setEditCompanies(companies);
      setEditCompanyOptions(companies.map((company) => ({ value: String(company.id), label: company.name })));
    } catch (error) {
      setEditCompanyLoadError(error instanceof Error ? error.message : 'Unable to load companies.');
    } finally {
      setIsLoadingEditCompanies(false);
    }
  }, [stockType]);

  const handleSaveEdit = useCallback(async () => {
    if (editingItemId === null) return;

    if (!editProductName.trim()) {
      showToastError('Product name is required.');
      return;
    }

    if (editCompanyId === null) {
      showToastError('Company is required.');
      return;
    }

    const selectedCompany = editCompanies.find((company) => company.id === editCompanyId);
    if (useCompanySearch && !selectedCompany) {
      showToastError('Please select a valid company from the list.');
      return;
    }

    try {
      const result = await updateStockItem(
        editingItemId,
        editProductName,
        Number(editBuyRate),
        stockType === 'MEDICINE' ? editUnit || 'gm' : stockType === 'CHICK' ? editUnit || 'pcs' : undefined,
        editCompanyId,
        Number(editQuantity) || 0
      );

      if (!result.success) {
        showToastError(result.message);
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItemId
            ? {
                ...item,
                name: editProductName,
                quantity: Number(editQuantity) || 0,
                buyRate: Number(editBuyRate),
                unit: stockType === 'MEDICINE' ? editUnit || 'gm' : stockType === 'CHICK' ? editUnit || 'pcs' : item.unit,
                companyId: editCompanyId,
                companyName: selectedCompany?.name ?? editCompanyName
              }
            : item
        )
      );

      success(result.message);
      setIsEditModalOpen(false);
      setEditingItemId(null);
      router.refresh();
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Failed to save stock changes.');
    }
  }, [editBuyRate, editCompanies, editCompanyId, editCompanyName, editProductName, editQuantity, editUnit, editingItemId, router, showToastError, stockType, success, useCompanySearch]);

  const handleDeleteItem = useCallback(() => {
    if (editingItemId === null) return;

    setRowToDelete(editingItemId);
    setConfirmOpen(true);
    setIsEditModalOpen(false);
  }, [editingItemId]);

  const handleDeleteItemRow = useCallback((itemId: number | undefined) => {
    if (!itemId) return;
    setRowToDelete(itemId);
    setConfirmOpen(true);
  }, []);

  const handleConfirmDeleteItemRow = useCallback(async () => {
    if (rowToDelete === null) return;
    setIsDeleting(true);

    try {
      const result = await deleteStockItem(rowToDelete, allowDeleteHistory);
      if (result.success) {
        setItems((prev) => prev.filter((item) => item.id !== rowToDelete));
        success(result.message);
        router.refresh();
      } else {
        showToastError(result.message);
      }
    } catch (err) {
      showToastError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setRowToDelete(null);
    }
  }, [allowDeleteHistory, rowToDelete, router, success, showToastError]);

  const removeRow = useCallback((rowId: number) => {
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
  }, []);

  const getProductDisplayLabel = (product: StockItem) => {
    if (stockType === 'MEDICINE') {
      return `${product.name} — Gram`;
    }
    return product.unit ? `${product.name} — ${product.unit}` : product.name;
  };

  const handleRowChange = useCallback((rowId: number, field: keyof StockRow, value: string) => {
    if (field === 'productName') {
      const normalizedValue = value.trim().toLowerCase();
      updateRow(rowId, 'productName', value);

      // Match by the display label for the current stock type.
      const exactMatch = availableProducts.find(
        (p) => getProductDisplayLabel(p).toLowerCase() === normalizedValue
      );

      if (exactMatch) {
        updateRow(rowId, 'productId', String(exactMatch.id ?? ''));
        updateRow(rowId, 'buyRate', String(exactMatch.buyRate ?? '0'));
        if (exactMatch.unit) {
          updateRow(rowId, 'unit', exactMatch.unit);
        }
      } else {
        updateRow(rowId, 'productId', '');
      }
      return;
    }
    updateRow(rowId, field, value);
  }, [availableProducts, updateRow]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!partyName.trim()) {
      showToastError('Please enter a company name.');
      return;
    }

    if (useCompanySearch && companyNames && !allowCreateCompany) {
      const matchedCompany = companyNames.find(
        (company) => company.label.toLowerCase() === partyName.toLowerCase()
      );
      if (!matchedCompany) {
        showToastError('Please select a valid company from the list.');
        return;
      }
    }

    for (const row of rows) {
      if (!row.productName.trim()) {
        showToastError('Please enter a product name for each row.');
        return;
      }
      if (Number(row.quantity) <= 0) {
        showToastError('Quantity must be greater than 0.');
        return;
      }
      if (Number(row.buyRate) < 0) {
        showToastError('Buy rate cannot be negative.');
        return;
      }
    }

    if (Number(paymentAmount) < 0) {
      showToastError('Payment amount cannot be negative.');
      return;
    }

    if (Number(companyDiscount) < 0) {
      showToastError('Company discount cannot be negative.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);

    try {
      const result = await createCompanyStockPurchaseTransaction(formData);

      if (!result.success) {
        showToastError(result.message);
        return;
      }

      setIsFormOpen(false);
      success(result.message);
      router.refresh();
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Stock purchase failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const SectionWrapper = asSection ? 'section' : 'main';
  const sectionClassName = asSection
    ? 'mx-auto w-full max-w-screen-3xl'
    : 'mx-auto min-h-[80vh] max-w-screen-3xl';

  return (
    <SectionWrapper className={sectionClassName}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">{dict.dashboard.totalStockValue}</div>
              <div className="text-primary">{totalStockValue.toLocaleString()} TK</div>
            </div>
            {showAddButton && (
              <button
                type="button"
                onClick={openForm}
                className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground sm:w-auto"
              >
                {addButtonLabel}
              </button>
            )}
          </div>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen} title={dict.stock.addStockTitle.replace('{title}', title)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">{dict.stock.company}</label>
                {useCompanySearch && companyNames ? (
                  <SearchableCombobox
                    options={companyNames}
                  value={partyName}
                  onValueChange={(value) => {
                      const matched = suppliers.find((supplier) => String(supplier.id) === value);
                      if (matched) {
                        setPartyName(matched.name);
                        setPartyId(matched.id);
                      } else {
                        setPartyName(value);
                        setPartyId(0);
                      }
                    }}
                    placeholder={dict.stock.searchCompany}
                    emptyText={dict.stock.noCompanyFound}
                    createNewLabel={allowCreateCompany ? createNewLabel : undefined}
                    name="partyName"
                    required
                  />
                ) : (
                  <>
                    <input
                      list={`parties-list-${title}`}
                      name="partyName"
                      value={partyName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPartyName(val);
                        const matched = suppliers.find((s) => s.name.toLowerCase() === val.toLowerCase());
                        if (matched) setPartyId(matched.id);
                        else setPartyId(0);
                      }}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder={dict.stock.inputCompany}
                      autoComplete="off"
                      required
                    />
                    <datalist id={`parties-list-${title}`}>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.name} />
                      ))}
                    </datalist>
                  </>
                )}
                <input type="hidden" name="partyId" value={partyId} />
                <input type="hidden" name="newPartyName" value={partyId ? '' : partyName} />
                <input type="hidden" name="newCompanyName" value={partyName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{dict.stock.purchaseDate}</label>
                <DateInput
                  name="transactionDate"
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/10 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{dict.stock.stockItems}</p>
                  {items.length > 0 ? (
                    <p className="text-xs text-muted-foreground">{dict.stock.stockItemsDescription} ({items.length} existing)</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{dict.stock.stockItemsEmpty}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={addRow}
                    className="whitespace-nowrap rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm"
                  >
                    {dict.dashboard.addProduct}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {rows.map((row) => (
                  <div key={row.rowId} className="border rounded-lg p-4 bg-white space-y-3">
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-medium">{stockType === 'MEDICINE' ? dict.stock.productLabel : stockType === 'CHICK' ? dict.dashboard.hatchlingChick : dict.stock.product}</label>
                      <input
                        list={`products-list-${title}`}
                        name="productName"
                        value={row.productName}
                        onChange={(event) => handleRowChange(row.rowId, 'productName', event.target.value)}
                        className="w-full h-10 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground"
                        placeholder={dict.common.search}
                        required
                      />
                      <datalist id={`products-list-${title}`}>
                        {availableProducts.map((product) => (
                          <option key={product.id} value={getProductDisplayLabel(product)} />
                        ))}
                      </datalist>
                      <input type="hidden" name="productId" value={row.productId} />
                      <input type="hidden" name="productType" value={stockType} />
                      {stockType === 'FEED' && (
                        <input type="hidden" name="unit" value="bag" />
                      )}
                    </div>
                    {stockType === 'MEDICINE' && (
                      <div className="w-24 ml-4">
                        <label className="mb-1 block text-sm font-medium">{dict.stock.gm}</label>
                        <input
                          type="number"
                          name="unit"
                          min="0"
                          step="0.01"
                          placeholder="500"
                          value={row.unit ?? ''}
                          onChange={(event) => handleRowChange(row.rowId, 'unit', event.target.value)}
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground"
                        />
                      </div>
                    )}
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_1fr_0.6fr] items-end">
                      <div>
                        <label className="mb-1 block text-sm font-medium">{stockType === 'MEDICINE' ? dict.stock.quantity : stockType === 'CHICK' ? dict.stock.quantityPcs : dict.stock.quantity}</label>
                        <input
                          type="number"
                          name="quantity"
                          min="0"
                          step="0.01"
                          value={row.quantity}
                          onChange={(event) => handleRowChange(row.rowId, 'quantity', event.target.value)}
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">{dict.stock.buyRate}</label>
                        <input
                          type="number"
                          name="buyRate"
                          min="0"
                          step="0.01"
                          value={row.buyRate}
                          onChange={(event) => handleRowChange(row.rowId, 'buyRate', event.target.value)}
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRow(row.rowId)}
                        className="rounded-md border px-3 py-2 text-sm h-10 flex items-center justify-center hover:bg-muted/10"
                      >
                        {dict.stock.remove}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{dict.stock.paymentMethod}</label>
                <select
                  name="paymentMethod"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full form-select"
                >
                  <option value="CASH">{dict.stock.cash}</option>
                  <option value="BANK_TRANSFER">{dict.stock.bankTransfer}</option>
                  <option value="CHEQUE">{dict.stock.cheque}</option>
                  <option value="MOBILE_MONEY">{dict.stock.mobileMoney}</option>
                  <option value="OTHER">{dict.stock.other}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{dict.stock.paymentAmount}</label>
                <input
                  type="number"
                  name="paymentAmount"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">{dict.stock.companyDiscount}</label>
                <input
                  type="number"
                  name="discount"
                  min="0"
                  step="0.01"
                  value={companyDiscount}
                  onChange={(event) => setCompanyDiscount(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{dict.stock.totalAmount}</label>
                <div className="rounded-md border bg-background px-3 py-2 text-sm">{discountedTotalAmount.toFixed(2)}</div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{dict.stock.dueAmount}</label>
                <div className="rounded-md border bg-background px-3 py-2 text-sm">{dueAmount.toFixed(2)}</div>
              </div>
            </div>
            <input type="hidden" name="referenceNumber" value="" />
            <input type="hidden" name="dueDate" value="" />
            <input type="hidden" name="notes" value="" />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? dict.stock.saving : dict.stock.saveStockPurchase}
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog>

        <Dialog
          open={isEditModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsEditModalOpen(false);
              setEditingItemId(null);
            }
          }}
          title={dict.stock.editTitle.replace('{title}', title)}
        >
          <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{dict.stock.productName}</label>
              <input
                type="text"
                value={editProductName}
                onChange={(event) => setEditProductName(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Edit product name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Company</label>
              {useCompanySearch ? (
                <SearchableCombobox
                  options={editCompanyOptions}
                  value={editCompanyId !== null ? String(editCompanyId) : editCompanyName}
                  onValueChange={(value) => {
                    const matched = editCompanies.find((company) => String(company.id) === value);
                    setEditCompanyId(matched?.id ?? null);
                    setEditCompanyName(matched?.name ?? value);
                  }}
                  placeholder={dict.stock.searchCompany}
                  emptyText={isLoadingEditCompanies ? 'Loading companies...' : editCompanyLoadError ?? dict.stock.noCompanyFound}
                  name="editCompanyName"
                  required
                />
              ) : (
                <input
                  type="text"
                  value={editCompanyName}
                  onChange={(event) => setEditCompanyName(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder={dict.stock.company}
                />
              )}
            </div>
          </div>
          {stockType === 'MEDICINE' ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">{dict.stock.gram}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editUnit}
                  onChange={(event) => setEditUnit(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{dict.stock.quantity}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editQuantity}
                  onChange={(event) => setEditQuantity(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium">{stockType === 'CHICK' ? dict.stock.quantityPcs : dict.stock.quantity}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editQuantity}
                onChange={(event) => setEditQuantity(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Buy Rate</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editBuyRate}
              onChange={(event) => setEditBuyRate(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDeleteItem}
                className="rounded-md border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                Delete
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  {dict.stock.saveChanges}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-md border px-4 py-2 text-sm"
                >
                  {dict.stock.cancel}
                </button>
              </div>
            </div>
          </div>
        </Dialog>

        <div className="mt-6 overflow-visible rounded-lg border">
          <ResponsiveTable stickyLastColumn minWidth="1120px">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{dict.stock.date}</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{dict.stock.companyName}</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{title} {dict.stock.productLabel}</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{productVariantLabel}</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{dict.stock.quantity}</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{dict.stock.paid}</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{dict.stock.due}</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{dict.stock.totalAmount}</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{dict.stock.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {items.map((item, index) => {
                  const rowKey = item.id ?? index;
                  return (
                    <tr key={`${rowKey}-${item.buyRate}-${item.unit || ''}`} className="hover:bg-muted/30">
                      <td className="px-2 py-2 sm:px-4 sm:py-3">{item.lastTransactionDate ? formatDateBD(item.lastTransactionDate) : '-'}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">{item.companyName || '-'}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">{item.name}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono">{item.unit || '-'}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">{item.quantity}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">{Number(item.paidAmount ?? 0).toFixed(2)} TK</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">{Number(item.dueAmount ?? 0).toFixed(2)} TK</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 font-medium">{(item.quantity * item.buyRate).toFixed(2)} TK</td>
                      <td className="relative px-2 py-2 sm:px-4 sm:py-3 overflow-visible">
                        <DropdownMenu.Root
                          open={openActionRowId === rowKey}
                          onOpenChange={(open) => setOpenActionRowId(open ? rowKey : null)}
                        >
                          <DropdownMenu.Trigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                              aria-label={`Actions for ${item.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenu.Trigger>

                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              side="bottom"
                              align="end"
                              sideOffset={8}
                              collisionPadding={12}
                              className="z-[100] w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
                            >
                              <DropdownMenu.Item
                                className="flex w-full items-center gap-2 rounded-none px-4 py-3 text-left text-sm font-medium text-slate-900 outline-none data-[highlighted]:bg-slate-100"
                                onSelect={() => {
                                  setOpenActionRowId(null);
                                  openEditModal(item);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="mx-2 h-px bg-slate-200" />
                              <DropdownMenu.Item
                                className="flex w-full items-center gap-2 rounded-none px-4 py-3 text-left text-sm font-medium text-rose-600 outline-none data-[highlighted]:bg-rose-50"
                                onSelect={() => {
                                  setOpenActionRowId(null);
                                  handleDeleteItemRow(item.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                      {dict.stock.noStockEntries}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={dict.stock.deleteStockItem}
        description={allowDeleteHistory ? dict.stock.deleteStockItemHistoryDescription : dict.stock.deleteStockItemDescription}
        confirmText={dict.stock.delete}
        cancelText={dict.common.cancel}
        onConfirm={handleConfirmDeleteItemRow}
        onCancel={() => {
          setConfirmOpen(false);
          setRowToDelete(null);
        }}
        isLoading={isDeleting}
      />
    </SectionWrapper>
  );
}
