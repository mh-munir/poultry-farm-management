'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useLocale } from '@/i18n/provider';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { createCompanyStockPurchaseTransaction } from '@/features/purchases/actions';
import { useModalSave } from '@/hooks/use-modal-save';
import { todayDateInputValueBD as todayDateStr } from '@/lib/dates';
import { STOCK_TYPE_OPTIONS, STOCK_PAYMENT_METHOD_OPTIONS } from '@/config/stock';
import type { StockItem } from './stock-management';

interface AddStockModalProps {
  feedCompanies: { id: number; name: string }[];
  medicineCompanies: { id: number; name: string }[];
  chickCompanies: { id: number; name: string }[];
  feedProducts: StockItem[];
  medicineProducts: StockItem[];
  chickProducts: StockItem[];
  stockTypeOptions?: ComboboxOption[];
  paymentMethodOptions?: ReadonlyArray<{ value: string; label: string }>;
  preselectedCompanyId?: number;
  preselectedCompanyType?: 'FEED' | 'MEDICINE' | 'CHICK';
  preselectedCompanyName?: string;
  buttonClassName?: string;
}

interface StockRow {
  rowId: number;
  productId: string;
  productName: string;
  quantity: string;
  buyRate: string;
  unit?: string;
}


export function AddStockModal({
  feedCompanies,
  medicineCompanies,
  chickCompanies,
  feedProducts,
  medicineProducts,
  chickProducts,
  stockTypeOptions = STOCK_TYPE_OPTIONS,
  paymentMethodOptions = STOCK_PAYMENT_METHOD_OPTIONS,
  preselectedCompanyId,
  preselectedCompanyType,
  preselectedCompanyName,
  buttonClassName,
}: AddStockModalProps) {
  const { dict } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [stockType, setStockType] = useState<'FEED' | 'MEDICINE' | 'CHICK'>(preselectedCompanyType ?? 'FEED');
  const { isSaving, saveError, save } = useModalSave();
  const [companyName, setCompanyName] = useState(preselectedCompanyName ?? '');
  const [companyId, setCompanyId] = useState(preselectedCompanyId ?? 0);
  const transactionDate = todayDateStr();
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [companyDiscount, setCompanyDiscount] = useState('');
  const [rows, setRows] = useState<StockRow[]>([
    { rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', unit: stockType === 'FEED' ? 'bag' : stockType === 'MEDICINE' ? 'gm' : 'pcs' },
  ]);
  const { error: showToastError } = useToast();

  const availableCompanies = useMemo(() => {
    const companies = stockType === 'FEED'
      ? feedCompanies
      : stockType === 'MEDICINE'
      ? medicineCompanies
      : [...feedCompanies, ...chickCompanies];

    return Array.from(new Map(companies.map((company) => [company.id, company])).values());
  }, [stockType, feedCompanies, medicineCompanies, chickCompanies]);

  const companyOptions: ComboboxOption[] = useMemo(() => {
    return availableCompanies.map((c) => ({ value: c.name, label: c.name }));
  }, [availableCompanies]);

  const availableProducts: StockItem[] = useMemo(() => {
    return stockType === 'FEED' ? feedProducts : stockType === 'MEDICINE' ? medicineProducts : chickProducts;
  }, [stockType, feedProducts, medicineProducts, chickProducts]);

  const defaultUnit = stockType === 'FEED' ? 'bag' : stockType === 'MEDICINE' ? 'gm' : 'pcs';

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

  const updateRow = (rowId: number, field: keyof StockRow, value: string) => {
    setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', unit: defaultUnit }]);
  };

  const removeRow = (rowId: number) => {
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const getProductDisplayLabel = (product: StockItem) => {
    if (stockType === 'MEDICINE') {
      return `${product.name} — ${dict.stock.gram}`;
    }
    return product.unit ? `${product.name} — ${product.unit}` : product.name;
  };

  const handleRowChange = (rowId: number, field: keyof StockRow, value: string) => {
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
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    if (!companyName.trim()) {
      showToastError('Please select a company.');
      return;
    }

    const matchedCompany = companyOptions.find(
      (company) => company.label.toLowerCase() === companyName.toLowerCase()
    );
    if (!matchedCompany) {
      showToastError('Please select a valid company from the list.');
      return;
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

    const result = await save(() => createCompanyStockPurchaseTransaction(formData), {
      refreshOnSuccess: true,
      onClose: () => setIsOpen(false),
      defaultErrorMessage: 'Stock purchase failed.'
    });

    if (!result.success) {
      return;
    }
  };

  const handleStockTypeChange = (value: string) => {
    if (preselectedCompanyType) return;
    
    const newType = value === 'MEDICINE' ? 'MEDICINE' : value === 'CHICK' ? 'CHICK' : 'FEED';
    setStockType(newType);
    setCompanyName('');
    setCompanyId(0);
    setRows([{ rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', unit: '' }]);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={`h-14 min-w-[190px] rounded-xl px-4 text-sm ${buttonClassName ?? ''}`}
      >
        <Plus className="h-4 w-4 mr-2" />
        {dict.stock.addStockButton}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen} title={dict.stock.addStockTitle.replace('{title}', dict.common.stock ?? 'Stock')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {!preselectedCompanyType && (
              <div>
                <label className="mb-1 block text-sm font-medium">{dict.stock.stockType} *</label>
                <SearchableCombobox
                  options={stockTypeOptions}
                  value={stockType}
                  onValueChange={handleStockTypeChange}
                  placeholder={dict.stock.selectStockType}
                  emptyText={dict.stock.noStockTypeFound}
                  name="stockType"
                  required
                />
              </div>
            )}
            {preselectedCompanyType && (
              <input type="hidden" name="stockType" value={preselectedCompanyType} />
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">{dict.stock.company} *</label>
              {preselectedCompanyName ? (
                <div className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm font-medium">
                  {preselectedCompanyName}
                </div>
              ) : (
                <SearchableCombobox
                  options={companyOptions}
                  value={companyName}
                  onValueChange={(value) => {
                    setCompanyName(value);
                    const matched = availableCompanies.find(
                      (s) => s.name.toLowerCase() === value.toLowerCase()
                    );
                    if (matched) {
                      setCompanyId(matched.id);
                    } else {
                      setCompanyId(0);
                    }
                  }}
                  placeholder={dict.stock.searchCompany}
                  emptyText={dict.stock.noCompanyFound}
                  name="companyName"
                  required
                />
              )}
              <input type="hidden" name="companyId" value={String(preselectedCompanyId ?? companyId)} />
              <input type="hidden" name="newCompanyName" value={preselectedCompanyName ?? companyName} />
            </div>
          </div>

          <input type="hidden" name="companyType" value={stockType} />
          <input type="hidden" name="transactionDate" value={transactionDate} />
          <input type="hidden" name="referenceNumber" value="" />
          <input type="hidden" name="dueDate" value="" />
          <input type="hidden" name="notes" value="" />

          <div className="rounded-2xl border bg-muted/10 p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{dict.stock.stockItems}</p>
                <p className="text-xs text-muted-foreground">{dict.stock.stockItemsDescription}</p>
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
                <div key={row.rowId} className="rounded-lg border border-border bg-white p-4">
                    <div
                      className={`grid gap-3 items-end ${stockType === 'MEDICINE'
                        ? 'md:grid-cols-[1.4fr_0.7fr_0.9fr_0.9fr_auto]'
                        : 'md:grid-cols-[1.8fr_0.9fr_0.9fr_auto]'}`}
                    >
                      <div>
                        <label className="mb-1 block text-sm font-medium">{stockType === 'MEDICINE' ? dict.stock.productLabel : stockType === 'CHICK' ? dict.dashboard.hatchlingChick : dict.stock.product}</label>
                        <input
                          list={`add-stock-products-${stockType}`}
                          name="productName"
                          value={row.productName}
                          onChange={(event) => handleRowChange(row.rowId, 'productName', event.target.value)}
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground"
                          placeholder={dict.stock.typeOrSearchProduct}
                          required
                        />
                        <datalist id={`add-stock-products-${stockType}`}>
                          {availableProducts.map((product) => (
                            <option key={product.id} value={getProductDisplayLabel(product)} />
                          ))}
                        </datalist>
                        <input type="hidden" name="productId" value={row.productId} />
                        <input type="hidden" name="productType" value={stockType} />
                        {stockType === 'FEED' && (
                          <input type="hidden" name="unit" value={defaultUnit} />
                        )}
                        {stockType === 'CHICK' && (
                          <input type="hidden" name="unit" value={defaultUnit} />
                        )}
                      </div>
                      {stockType === 'MEDICINE' && (
                        <div>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.rowId)}
                      aria-label="Remove stock item"
                      className="h-10 w-10 shrink-0 bg-white text-slate-600 hover:bg-slate-100"
                    >
                      <Trash2 className="h-8 w-8" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{dict.stock.paymentMethod}</label>
              <select
                name="paymentMethod"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full form-select"
              >
                {paymentMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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

          <div className="grid gap-4 md:grid-cols-3">
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

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? dict.stock.saving : dict.stock.saveStockPurchase}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
              className="rounded-md border px-4 py-2 text-sm"
            >
              {dict.common.cancel}
            </button>
          </div>
          {saveError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm">
              <p className="text-sm font-semibold text-rose-900">⚠️ {dict.common.warning}</p>
              <p className="mt-1 text-sm text-rose-800">{saveError}</p>
            </div>
          )}
        </form>
      </Dialog>
    </>
  );
}
