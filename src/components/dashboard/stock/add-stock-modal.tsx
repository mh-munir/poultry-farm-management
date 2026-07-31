'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { createCompanyStockPurchaseTransaction } from '@/features/purchases/actions';
import { getCompanyCurrentDue } from '@/features/companies/actions';
import { useToast } from '@/hooks/use-toast';
import type { StockItem } from './stock-management';

interface AddStockModalProps {
  feedCompanies: { id: number; name: string }[];
  medicineCompanies: { id: number; name: string }[];
  feedProducts: StockItem[];
  medicineProducts: StockItem[];
}

interface StockRow {
  rowId: number;
  productId: string;
  productName: string;
  quantity: string;
  buyRate: string;
  saleRate: string;
  unit?: string;
}

const STOCK_TYPE_OPTIONS: ComboboxOption[] = [
  { value: 'FEED', label: 'Feed' },
  { value: 'MEDICINE', label: 'Medicine' },
];

export function AddStockModal({
  feedCompanies,
  medicineCompanies,
  feedProducts,
  medicineProducts,
}: AddStockModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stockType, setStockType] = useState<'FEED' | 'MEDICINE'>('FEED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState(0);
  const [previousDue, setPreviousDue] = useState(0);
  const transactionDate = new Date().toISOString().slice(0, 10);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [rows, setRows] = useState<StockRow[]>([
    { rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', saleRate: '', unit: '' },
  ]);
  const router = useRouter();
  const { success, error: showToastError } = useToast();

  const companyOptions: ComboboxOption[] = useMemo(() => {
    const companies = stockType === 'FEED' ? feedCompanies : medicineCompanies;
    return companies.map((c) => ({ value: c.name, label: c.name }));
  }, [stockType, feedCompanies, medicineCompanies]);

  const availableProducts: StockItem[] = useMemo(() => {
    return stockType === 'FEED' ? feedProducts : medicineProducts;
  }, [stockType, feedProducts, medicineProducts]);

  const defaultUnit = stockType === 'FEED' ? 'bag' : 'gm';

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => {
      const quantity = Number(row.quantity) || 0;
      const buyRate = Number(row.buyRate) || 0;
      return sum + quantity * buyRate;
    }, 0);
  }, [rows]);

  const dueAmount = useMemo(() => {
    const payment = Number(paymentAmount) || 0;
    return Math.max(0, totalAmount - payment);
  }, [paymentAmount, totalAmount]);

  const updateRow = (rowId: number, field: keyof StockRow, value: string) => {
    setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', saleRate: '', unit: defaultUnit }]);
  };

  const removeRow = (rowId: number) => {
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const handleRowChange = (rowId: number, field: keyof StockRow, value: string) => {
    if (field === 'productName') {
      const normalizedValue = value.trim();
      updateRow(rowId, 'productName', value);
      const product = availableProducts.find(
        (p) => p.name.trim().toLowerCase() === normalizedValue.toLowerCase()
      );
      if (product) {
        updateRow(rowId, 'productId', String(product.id ?? ''));
        updateRow(rowId, 'buyRate', String(product.buyRate ?? '0'));
        updateRow(rowId, 'saleRate', String(product.salesRate ?? '0'));
        if (product.unit) {
          updateRow(rowId, 'unit', product.unit);
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

    if (isSubmitting) {
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
      if (Number(row.saleRate) < 0) {
        showToastError('Sale rate cannot be negative.');
        return;
      }
    }

    if (Number(paymentAmount) < 0) {
      showToastError('Payment amount cannot be negative.');
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

      setIsOpen(false);
      success(result.message);
      router.refresh();
    } catch (error) {
      showToastError(error instanceof Error ? error.message : 'Stock purchase failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockTypeChange = (value: string) => {
    const newType = value === 'MEDICINE' ? 'MEDICINE' : 'FEED';
    setStockType(newType);
    setCompanyName('');
    setCompanyId(0);
    setRows([{ rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', saleRate: '', unit: '' }]);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Stock
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen} title="Add Stock">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Stock Type *</label>
              <SearchableCombobox
                options={STOCK_TYPE_OPTIONS}
                value={stockType === 'MEDICINE' ? 'MEDICINE' : 'FEED'}
                onValueChange={handleStockTypeChange}
                placeholder="Select stock type..."
                emptyText="No stock type found"
                name="stockType"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Company *</label>
              <SearchableCombobox
                options={companyOptions}
                value={companyName}
                onValueChange={(value) => {
                  setCompanyName(value);
                  const matched = (stockType === 'FEED' ? feedCompanies : medicineCompanies).find(
                    (s) => s.name.toLowerCase() === value.toLowerCase()
                  );
                  if (matched) {
                    setCompanyId(matched.id);
                  } else {
                    setCompanyId(0);
                  }
                }}
                placeholder="Search company..."
                emptyText="No company found"
                name="companyName"
                required
              />
              <input type="hidden" name="companyId" value={String(companyId)} />
              <input type="hidden" name="newCompanyName" value={companyName} />
            </div>
          </div>

          <input type="hidden" name="companyType" value={stockType} />
          <input type="hidden" name="transactionDate" value={transactionDate} />
          <input type="hidden" name="discount" value="0" />
          <input type="hidden" name="referenceNumber" value="" />
          <input type="hidden" name="dueDate" value="" />
          <input type="hidden" name="notes" value="" />

          <div className="rounded-2xl border bg-muted/10 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Stock items</p>
                <p className="text-xs text-muted-foreground">Select from existing items below, or add new ones with quantity and pricing.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={addRow}
                  className="whitespace-nowrap rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm"
                >
                  Add product
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {  rows.map((row) => (
                <div key={row.rowId} className="border rounded-lg p-4 bg-white space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-medium">{stockType === 'MEDICINE' ? 'Stock Medicine' : 'Product'}</label>
                      <input
                        list={`add-stock-products-${stockType}`}
                        name="productName"
                        value={row.productName}
                        onChange={(event) => handleRowChange(row.rowId, 'productName', event.target.value)}
                        className="w-full h-10 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground"
                        placeholder="Type or search product"
                        required
                      />
                      <datalist id={`add-stock-products-${stockType}`}>
                        {availableProducts.map((product) => (
                          <option key={product.id} value={product.name} />
                        ))}
                      </datalist>
                      <input type="hidden" name="productId" value={row.productId} />
                      <input type="hidden" name="productType" value={stockType} />
                      {stockType === 'FEED' && (
                        <input type="hidden" name="unit" value={defaultUnit} />
                      )}
                    </div>
                    {stockType === 'MEDICINE' && (
                      <div className="w-24 ml-4">
                        <label className="mb-1 block text-sm font-medium">Gm</label>
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
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_0.6fr] items-end">
                    <div>
                      <label className="mb-1 block text-sm font-medium">{stockType === 'MEDICINE' ? 'Quantity' : 'Quantity Of Sack'}</label>
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
                      <label className="mb-1 block text-sm font-medium">Buy Rate</label>
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
                    <div>
                      <label className="mb-1 block text-sm font-medium">Sale Rate</label>
                      <input
                        type="number"
                        name="saleRate"
                        min="0"
                        step="0.01"
                        value={row.saleRate}
                        onChange={(event) => handleRowChange(row.rowId, 'saleRate', event.target.value)}
                        className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(row.rowId)}
                      className="rounded-md border px-3 py-2 text-sm h-10 flex items-center justify-center hover:bg-muted/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Payment Method</label>
              <select
                name="paymentMethod"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Payment Amount</label>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Total Amount</label>
              <div className="rounded-md border bg-background px-3 py-2 text-sm">{totalAmount.toFixed(2)}</div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Due Amount</label>
              <div className="rounded-md border bg-background px-3 py-2 text-sm">{dueAmount.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Saving...' : 'Save stock purchase'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
