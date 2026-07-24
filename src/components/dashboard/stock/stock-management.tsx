'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { createPurchaseTransaction } from '@/features/purchases/actions';

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

interface SupplierOption {
  id: number;
  name: string;
}

interface StockManagementProps {
  title: string;
  description: string;
  addButtonLabel: string;
  initialItems: StockItem[];
  availableProducts: StockItem[];
  suppliers: SupplierOption[];
  redirectPath: string;
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
  redirectPath
}: StockManagementProps) {
  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editBuyRate, setEditBuyRate] = useState('0');
  const [editSaleRate, setEditSaleRate] = useState('0');
  const [supplierId, setSupplierId] = useState<number>(0);
  const [supplierName, setSupplierName] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<StockRow[]>([{ rowId: 1, productId: '', productName: '', quantity: '1', buyRate: '0', saleRate: '0', unit: '' }]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // do not auto-select first supplier; user must choose or type a new name

  const totalStockValue = items.reduce((total, item) => total + item.quantity * item.buyRate, 0);

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
    setRows((prev) => [...prev, { rowId: Date.now(), productId: '', productName: '', quantity: '1', buyRate: '0', saleRate: '0', unit: title === 'Medicine' ? 'gm' : 'bag' }]);
  };

  const openForm = () => {
    // when opening for Medicine default unit to gm for the initial row, for Feed default to bag
    if (title === 'Medicine') {
      setRows([{ rowId: Date.now(), productId: '', productName: '', quantity: '1', buyRate: '0', saleRate: '0', unit: 'gm' }]);
    } else {
      setRows([{ rowId: Date.now(), productId: '', productName: '', quantity: '1', buyRate: '0', saleRate: '0', unit: 'bag' }]);
    }
    setIsFormOpen(true);
  };

  const openEditModal = (item: StockItem) => {
    setEditingItemId(item.id ?? null);
    setEditBuyRate(String(item.buyRate ?? '0'));
    setEditSaleRate(String(item.salesRate ?? '0'));
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingItemId === null) return;
    
    setItems((prev) =>
      prev.map((item) =>
        item.id === editingItemId
          ? { ...item, buyRate: Number(editBuyRate), salesRate: Number(editSaleRate) }
          : item
      )
    );
    setIsEditModalOpen(false);
  };

  const removeRow = (rowId: number) => {
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const handleRowChange = (rowId: number, field: keyof StockRow, value: string) => {
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
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    // supplier name is required; existing supplier selection is optional because new suppliers are allowed
    if (!supplierName.trim()) {
      event.preventDefault();
      setError('Please enter a supplier name.');
      return;
    }

    // check each row for specific issues
    for (const row of rows) {
      if (!row.productId) {
        event.preventDefault();
        setError('Please select a product for each row.');
        return;
      }
      if (Number(row.quantity) <= 0) {
        event.preventDefault();
        setError('Quantity must be greater than 0.');
        return;
      }
      if (Number(row.buyRate) < 0) {
        event.preventDefault();
        setError('Buy rate cannot be negative.');
        return;
      }
      if (Number(row.saleRate) < 0) {
        event.preventDefault();
        setError('Sale rate cannot be negative.');
        return;
      }
    }

    // prevent free-text product names that are not matched to an existing product
    const unmatched = rows.find((row) => (row.productName && !row.productId));
    if (unmatched) {
      event.preventDefault();
      setError('Please choose products from the suggestions (select a suggestion so the product is recognized).');
      return;
    }

    if (Number(paymentAmount) < 0) {
      event.preventDefault();
      setError('Payment amount cannot be negative.');
      return;
    }

    setError(null);
    // allow form submission to proceed to server action
  };

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">Total Stock Value</div>
              <div className="text-primary">{totalStockValue.toLocaleString()} TK</div>
            </div>
            <button
              type="button"
              onClick={openForm}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              {addButtonLabel}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen} title={`Add ${title} Stock`}>
          <form action={createPurchaseTransaction} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Company / Supplier</label>
                <input
                  list={`suppliers-list-${title}`}
                  name="supplierName"
                  value={supplierName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupplierName(val);
                    const matched = suppliers.find((s) => s.name.toLowerCase() === val.toLowerCase());
                    if (matched) setSupplierId(matched.id);
                    else setSupplierId(0);
                  }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Input your Company / Supplier"
                  autoComplete="off"
                  required
                />
                <datalist id={`suppliers-list-${title}`}>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.name} />
                  ))}
                </datalist>
                <input type="hidden" name="partyId" value={supplierId} />
                <input type="hidden" name="newPartyName" value={supplierId ? '' : supplierName} />
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
              <div className="mb-3 flex items-start justify-between gap-3">
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
                          name={`productName-${row.rowId}`}
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
                      </div>
                      <div className="w-24 ml-4">
                        <label className="mb-1 block text-sm font-medium">{title === 'Medicine' ? 'Gm' : 'Unit'}</label>
                        {title === 'Medicine' ? (
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
                        ) : (
                          <input
                            type="text"
                            name="unit"
                            placeholder="bag"
                            value={row.unit ?? 'bag'}
                            onChange={(event) => handleRowChange(row.rowId, 'unit', event.target.value)}
                            className="w-full h-10 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground"
                          />
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_0.6fr] items-end">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Quantity</label>
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

            <input type="hidden" name="redirectPath" value={redirectPath} />
            <input type="hidden" name="discount" value="0" />
            <input type="hidden" name="referenceNumber" value="" />
            <input type="hidden" name="dueDate" value="" />
            <input type="hidden" name="notes" value="" />

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Save stock purchase
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Company Name</th>
                  <th className="px-4 py-3 text-left font-medium">{title} Name</th>
                  <th className="px-4 py-3 text-left font-medium">Gram</th>
                  <th className="px-4 py-3 text-left font-medium">Quantity</th>
                  <th className="px-4 py-3 text-left font-medium">Paid</th>
                  <th className="px-4 py-3 text-left font-medium">Due</th>
                  <th className="px-4 py-3 text-left font-medium">Total Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {items.map((item) => (
                  <tr key={`${item.id ?? item.name}-${item.buyRate}`} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{item.lastTransactionDate ? new Date(item.lastTransactionDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">{item.companyName || '-'}</td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3">{item.unit || '-'}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">{Number(item.paidAmount ?? 0).toFixed(2)} TK</td>
                    <td className="px-4 py-3">{Number(item.dueAmount ?? 0).toFixed(2)} TK</td>
                    <td className="px-4 py-3 font-medium">{(item.quantity * item.buyRate).toFixed(2)} TK</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600"
                      >
                        Edit
                      </button>
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
          </div>
        </div>
      </div>
    </main>
  );
}
