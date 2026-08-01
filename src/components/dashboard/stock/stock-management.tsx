'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/dialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { createCompanyStockPurchaseTransaction } from '@/features/purchases/actions';
import { useToast } from '@/hooks/use-toast';
import { Printer } from 'lucide-react';

export interface StockItem {
  id?: number;
  name: string;
  quantity: number;
  buyRate: number;
  salesRate: number;
  unit?: string;
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
  createNewLabel?: string;
  asSection?: boolean;
  showAddButton?: boolean;
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
  createNewLabel,
  asSection = false,
  showAddButton = true,
}: StockManagementProps) {
  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editBuyRate, setEditBuyRate] = useState('');
  const [editSaleRate, setEditSaleRate] = useState('');
  const [partyId, setPartyId] = useState<number>(0);
  const [partyName, setPartyName] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState<StockRow[]>([{ rowId: 1, productId: '', productName: '', quantity: '', buyRate: '', saleRate: '', unit: '' }]);
  const router = useRouter();
  const { success, error: showToastError } = useToast();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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

  const dueAmount = useMemo(() => {
    const payment = Number(paymentAmount) || 0;
    return Math.max(0, totalAmount - payment);
  }, [paymentAmount, totalAmount]);

  const updateRow = useCallback((rowId: number, field: keyof StockRow, value: string) => {
    setRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', saleRate: '', unit: title === 'Medicine' ? 'gm' : 'bag' }]);
  }, [title]);

  const openForm = useCallback(() => {
    if (title === 'Medicine') {
      setRows([{ rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', saleRate: '', unit: 'gm' }]);
    } else {
      setRows([{ rowId: Date.now(), productId: '', productName: '', quantity: '', buyRate: '', saleRate: '', unit: 'bag' }]);
    }
    setIsFormOpen(true);
  }, [title]);

  const openEditModal = useCallback((item: StockItem) => {
    setEditingItemId(item.id ?? null);
    setEditBuyRate(String(item.buyRate ?? '0'));
    setEditSaleRate(String(item.salesRate ?? '0'));
    setIsEditModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingItemId === null) return;
    
    setItems((prev) =>
      prev.map((item) =>
        item.id === editingItemId
          ? { ...item, buyRate: Number(editBuyRate), salesRate: Number(editSaleRate) }
          : item
      )
    );
    setIsEditModalOpen(false);
  }, [editBuyRate, editSaleRate, editingItemId]);

  const removeRow = useCallback((rowId: number) => {
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
  }, []);

  const handleRowChange = useCallback((rowId: number, field: keyof StockRow, value: string) => {
    if (field === 'productName') {
      const normalizedValue = value.trim();
      updateRow(rowId, 'productName', value);
      const product = availableProducts.find((p) => p.name.trim().toLowerCase() === normalizedValue.toLowerCase());
      if (product) {
        updateRow(rowId, 'productId', String(product.id ?? ''));
        updateRow(rowId, 'buyRate', String(product.buyRate ?? '0'));
        updateRow(rowId, 'saleRate', String(product.salesRate ?? '0'));
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
    ? 'mx-auto max-w-screen-3xl'
    : 'mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4 sm:px-4';

  return (
    <SectionWrapper className={sectionClassName}>
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">Total Stock Value</div>
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

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen} title={`Add ${title} Stock`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Company</label>
                {useCompanySearch && companyNames ? (
                  <SearchableCombobox
                    options={companyNames}
                    value={partyName}
                    onValueChange={(value) => {
                      setPartyName(value);
                      const matched = suppliers.find((s) => s.name.toLowerCase() === value.toLowerCase());
                      if (matched) {
                        setPartyId(matched.id);
                      } else {
                        setPartyId(0);
                      }
                    }}
                    placeholder="Search company..."
                    emptyText="No company found"
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
                      placeholder="Input your Party / Company"
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
                <label className="mb-1 block text-sm font-medium">Purchase Date</label>
                <input
                  type="date"
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
                  <p className="text-sm font-semibold">Stock items</p>
                  {items.length > 0 ? (
                    <p className="text-xs text-muted-foreground">Select from existing medicines below, or add new ones with quantity and pricing. ({items.length} existing)</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Add new medicines with quantity and pricing.</p>
                  )}
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
                {rows.map((row, index) => (
                  <div key={row.rowId} className="border rounded-lg p-4 bg-white space-y-3">
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-medium">{title === 'Medicine' ? 'Stock Medicine' : 'Product'}</label>
                      <input
                        list={`products-list-${title}`}
                        name="productName"
                        value={row.productName}
                        onChange={(event) => handleRowChange(row.rowId, 'productName', event.target.value)}
                        className="w-full h-10 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground"
                        placeholder="Type or search product"
                        required
                      />
                      <datalist id={`products-list-${title}`}>
                        {availableProducts.map((product) => (
                          <option key={product.id} value={product.name} />
                        ))}
                      </datalist>
                      <input type="hidden" name="productId" value={row.productId} />
                      <input type="hidden" name="productType" value={title === 'Medicine' ? 'MEDICINE' : 'FEED'} />
                      {title === 'Feed' && (
                        <input type="hidden" name="unit" value="bag" />
                      )}
                    </div>
                    {title === 'Medicine' && (
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
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1fr_0.6fr] items-end">
                      <div>
                        <label className="mb-1 block text-sm font-medium">{title === 'Medicine' ? 'Quantity' : 'Quantity Of Sack'}</label>
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

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-4">
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

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Total Amount</label>
                <div className="rounded-md border bg-background px-3 py-2 text-sm">{totalAmount.toFixed(2)}</div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Due Amount</label>
                <div className="rounded-md border bg-background px-3 py-2 text-sm">{dueAmount.toFixed(2)}</div>
              </div>
            </div>

            <input type="hidden" name="discount" value="0" />
            <input type="hidden" name="referenceNumber" value="" />
            <input type="hidden" name="dueDate" value="" />
            <input type="hidden" name="notes" value="" />

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
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen} title={`Edit ${title} Rates`}>
          <div className="space-y-4">
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
            <div>
              <label className="mb-1 block text-sm font-medium">Sale Rate</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editSaleRate}
                onChange={(event) => setEditSaleRate(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog>

        <div className="mt-6 overflow-hidden rounded-lg border">
          <ResponsiveTable stickyLastColumn minWidth="1120px">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">Date</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">Company Name</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{title} Name</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">Gram</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">Quantity</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">Paid</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">Due</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">Total Amount</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {items.map((item) => (
                  <tr key={`${item.id ?? item.name}-${item.buyRate}`} className="hover:bg-muted/30">
                    <td className="px-2 py-2 sm:px-4 sm:py-3">{item.lastTransactionDate ? new Date(item.lastTransactionDate).toLocaleDateString() : '-'}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">{item.companyName || '-'}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">{item.name}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">{item.unit || '-'}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">{item.quantity}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">{Number(item.paidAmount ?? 0).toFixed(2)} TK</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">{Number(item.dueAmount ?? 0).toFixed(2)} TK</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 font-medium">{(item.quantity * item.buyRate).toFixed(2)} TK</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <a
                          href={`/dashboard/stock/print/${item.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                        >
                          <Printer className="h-3 w-3" />
                          Print
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                      No stock entries found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
      </div>
    </SectionWrapper>
  );
}
