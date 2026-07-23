'use client';

import { useMemo, useState } from 'react';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSaleTransaction } from '@/features/sales/actions';

type CustomerOption = {
  id: number;
  name: string;
};

type ProductOption = {
  id: number;
  name: string;
  code: string;
  defaultSellingPrice: number;
};

type SaleItemRow = {
  rowId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  description: string;
};

type SaleFormProps = {
  customers: CustomerOption[];
  products: ProductOption[];
};

function createRow(): SaleItemRow {
  return {
    rowId: `${Date.now()}-${Math.random()}`,
    productId: '',
    quantity: '1',
    unitPrice: '0',
    description: ''
  };
}

export function SaleForm({ customers, products }: SaleFormProps) {
  const [rows, setRows] = useState<SaleItemRow[]>(() => [createRow()]);
  const [discount, setDiscount] = useState('0');
  const [paymentAmount, setPaymentAmount] = useState('0');

  const productsById = useMemo(() => {
    return new Map(products.map((product) => [String(product.id), product]));
  }, [products]);

  const subtotal = rows.reduce((sum, row) => {
    return sum + Number(row.quantity || 0) * Number(row.unitPrice || 0);
  }, 0);
  const totalAmount = Math.max(0, subtotal - Number(discount || 0));
  const dueAmount = Math.max(0, totalAmount - Number(paymentAmount || 0));

  const updateRow = (rowId: string, field: keyof Omit<SaleItemRow, 'rowId'>, value: string) => {
    setRows((currentRows) => currentRows.map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      if (field === 'productId') {
        const product = productsById.get(value);
        return {
          ...row,
          productId: value,
          unitPrice: product ? String(product.defaultSellingPrice) : '0'
        };
      }

      return { ...row, [field]: value };
    }));
  };

  return (
    <form action={createSaleTransaction} autoComplete="off" className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Customer</label>
        <select name="partyId" required className="w-full rounded-md border bg-background px-3 py-2">
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Items</div>
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((currentRows) => [...currentRows, createRow()])}>
            <Plus className="mr-2 h-4 w-4" />Add
          </Button>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.rowId} className="grid gap-3 md:grid-cols-[1.2fr_0.55fr_0.65fr_1fr_auto]">
              <select
                name="productId"
                required={rows.length === 1}
                value={row.productId}
                onChange={(event) => updateRow(row.rowId, 'productId', event.target.value)}
                className="rounded-md border bg-background px-3 py-2"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.code})</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                name="quantity"
                value={row.quantity}
                onChange={(event) => updateRow(row.rowId, 'quantity', event.target.value)}
                placeholder="Qty"
                className="rounded-md border bg-background px-3 py-2"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                name="unitPrice"
                value={row.unitPrice}
                onChange={(event) => updateRow(row.rowId, 'unitPrice', event.target.value)}
                placeholder="Price"
                className="rounded-md border bg-background px-3 py-2"
              />
              <input
                name="description"
                value={row.description}
                onChange={(event) => updateRow(row.rowId, 'description', event.target.value)}
                placeholder="Description"
                className="rounded-md border bg-background px-3 py-2"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((currentRows) => currentRows.length > 1 ? currentRows.filter((item) => item.rowId !== row.rowId) : currentRows)}
                disabled={rows.length === 1}
                aria-label="Remove sale item"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">Total Amount</label>
          <input value={totalAmount.toFixed(2)} readOnly className="w-full rounded-md border bg-muted px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Paid Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="paymentAmount"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Due Amount</label>
          <input value={dueAmount.toFixed(2)} readOnly className="w-full rounded-md border bg-muted px-3 py-2" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Discount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="discount"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Payment method</label>
          <select name="paymentMethod" className="w-full rounded-md border bg-background px-3 py-2">
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="MOBILE_MONEY">Mobile money</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Reference number</label>
        <input name="referenceNumber" className="w-full rounded-md border bg-background px-3 py-2" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Notes</label>
        <textarea name="notes" rows={3} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Invoice notes or remarks" />
      </div>

      <Button type="submit" className="w-full"><DollarSign className="mr-2 h-4 w-4" />Save Sale</Button>
    </form>
  );
}
