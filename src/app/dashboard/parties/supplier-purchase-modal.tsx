'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { getSupplierOptions, getSupplierCurrentPayable, createSupplierPurchase } from '@/features/parties/actions';
import { DateInput } from '@/components/ui/date-input';
import { todayDateInputValueBD as todayDateStr } from '@/lib/dates';

type SupplierPurchaseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PurchaseLine = {
  productCategory: 'EGG' | 'CHICKEN';
  productName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineTotalCents: bigint;
};

const SCALE = 4;
const CENTS_SCALE = 2;

function parseDecimalToScaledBigInt(value: string, scale = SCALE) {
  const normalized = value.trim().replace(/,/g, '').replace(/[^0-9.-]/g, '');
  if (!normalized || normalized === '.' || normalized === '-' || normalized === '-.') {
    return 0n;
  }

  const negative = normalized.startsWith('-');
  const [integerPart, fractionalPart = ''] = normalized.replace('-', '').split('.');
  const digits = integerPart.replace(/^0+(?!$)/, '') || '0';
  const fraction = (fractionalPart + '0'.repeat(scale)).slice(0, scale);
  return BigInt(digits + fraction) * (negative ? -1n : 1n);
}

function roundScaledBigInt(value: bigint, fromScale: number, toScale: number) {
  if (fromScale === toScale) return value;
  if (fromScale < toScale) {
    return value * 10n ** BigInt(toScale - fromScale);
  }

  const factor = 10n ** BigInt(fromScale - toScale);
  const quotient = value / factor;
  const remainder = value % factor;
  const absRemainder = remainder >= 0n ? remainder : -remainder;
  const half = factor / 2n;
  if (absRemainder >= half) {
    return value >= 0n ? quotient + 1n : quotient - 1n;
  }
  return quotient;
}

function toCents(value: string) {
  return roundScaledBigInt(parseDecimalToScaledBigInt(value), SCALE, CENTS_SCALE);
}

function centsToDecimalString(cents: bigint) {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;
  return `${negative ? '-' : ''}${whole.toString()}.${fraction.toString().padStart(2, '0')}`;
}

function formatCurrency(cents: bigint) {
  const formatted = centsToDecimalString(cents);
  const [integerPart, fractionPart] = formatted.split('.');
  return `৳ ${Number(integerPart).toLocaleString('en-US')}.${fractionPart}`;
}

export function SupplierPurchaseModal({ open, onOpenChange }: SupplierPurchaseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partyOptions, setPartyOptions] = useState<ComboboxOption[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [partyName, setPartyName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => todayDateStr());
  const [productCategory, setProductCategory] = useState<'EGG' | 'CHICKEN'>('EGG');
  const [eggQuantity, setEggQuantity] = useState('');
  const [eggUnitPrice, setEggUnitPrice] = useState('');
  const [chickenTotalQuantity, setChickenTotalQuantity] = useState('');
  const [chickenTotalKg, setChickenTotalKg] = useState('');
  const [chickenUnitPrice, setChickenUnitPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [previousDue, setPreviousDue] = useState(0);
  const [formError, setFormError] = useState('');
  const router = useRouter();
  const { success, error: showError } = useToast();

  const eggTotalCents = useMemo(() => {
    const quantity = parseDecimalToScaledBigInt(eggQuantity);
    const price = parseDecimalToScaledBigInt(eggUnitPrice);
    const product = quantity * price;
    return roundScaledBigInt(product, SCALE * 2, CENTS_SCALE);
  }, [eggQuantity, eggUnitPrice]);

  const chickenTotalCents = useMemo(() => {
    const quantity = parseDecimalToScaledBigInt(chickenTotalKg);
    const price = parseDecimalToScaledBigInt(chickenUnitPrice);
    const product = quantity * price;
    return roundScaledBigInt(product, SCALE * 2, CENTS_SCALE);
  }, [chickenTotalKg, chickenUnitPrice]);

  const chickenWeightTotal = useMemo(() => parseDecimalToScaledBigInt(chickenTotalKg, 2), [chickenTotalKg]);

  const subtotalCents = useMemo(() => {
    if (productCategory === 'EGG') return eggTotalCents;
    if (productCategory === 'CHICKEN') return chickenTotalCents;
    return eggTotalCents + chickenTotalCents;
  }, [productCategory, eggTotalCents, chickenTotalCents]);

  const discountCents = useMemo(() => {
    const cents = toCents(discount);
    if (cents < 0n) return 0n;
    return cents > subtotalCents ? subtotalCents : cents;
  }, [discount, subtotalCents]);

  const supplierPurchaseTotalCents = useMemo(() => {
    const result = subtotalCents - discountCents;
    return result < 0n ? 0n : result;
  }, [subtotalCents, discountCents]);

  const paidAmountCents = useMemo(() => {
    const cents = toCents(paidAmount);
    return cents < 0n ? 0n : cents;
  }, [paidAmount]);

  const dueAmountCents = useMemo(() => {
    const result = supplierPurchaseTotalCents - paidAmountCents;
    return result;
  }, [supplierPurchaseTotalCents, paidAmountCents]);

  const finalDueCents = useMemo(() => {
    const prevDueCents = toCents(previousDue.toFixed(2));
    return prevDueCents + dueAmountCents;
  }, [previousDue, dueAmountCents]);

  const showEgg = productCategory === 'EGG';
  const showChicken = productCategory === 'CHICKEN';

  useEffect(() => {
    if (!open) {
      return;
    }

    getSupplierOptions().then((options: Array<{ id: number; name: string }>) => {
      setPartyOptions(options.map((option) => ({ value: String(option.id), label: option.name })));
    });

    setSelectedPartyId(null);
    setPartyName('');
    setPurchaseDate(todayDateStr());
    setProductCategory('EGG');
    setEggQuantity('');
    setEggUnitPrice('');
    setChickenTotalQuantity('');
    setChickenTotalKg('');
    setChickenUnitPrice('');
    setPaidAmount('');
    setPreviousDue(0);
    setFormError('');
  }, [open]);

  const buildPurchaseLines = (): PurchaseLine[] => {
    const lines: PurchaseLine[] = [];

    if (showEgg && eggTotalCents > 0n) {
      lines.push({
        productCategory: 'EGG',
        productName: 'Egg',
        quantity: eggQuantity,
        unit: 'pcs',
        unitPrice: eggUnitPrice,
        lineTotalCents: eggTotalCents
      });
    }

    if (showChicken && chickenTotalCents > 0n) {
      lines.push({
        productCategory: 'CHICKEN',
        productName: 'Chicken',
        quantity: chickenTotalQuantity,
        unit: 'kg',
        unitPrice: chickenUnitPrice,
        lineTotalCents: chickenTotalCents
      });
    }

    return lines;
  };

  const distributeProportionalCents = (amounts: bigint[], total: bigint) => {
    const sum = amounts.reduce((acc, value) => acc + value, 0n);
    if (sum === 0n) {
      return amounts.map(() => 0n);
    }

    const shares = amounts.map((value) => (value * total) / sum);
    const remainder = total - shares.reduce((acc, value) => acc + value, 0n);
    if (remainder !== 0n) {
      shares[0] = shares[0] + remainder;
    }
    return shares;
  };

  const getPaymentSplits = (lines: PurchaseLine[], lineDiscounts: bigint[]) => {
    const paid = paidAmountCents;
    const netTotals = lines.map((line, index) => line.lineTotalCents - lineDiscounts[index]);

    if (lines.length <= 1) {
      return lines.map(() => centsToDecimalString(paid));
    }

    const splits = distributeProportionalCents(netTotals, paid);
    return splits.map(centsToDecimalString);
  };

  const validateForm = () => {
    if (!selectedPartyId) {
      return 'Supplier is required.';
    }

    if (!purchaseDate) {
      return 'Purchase date is required.';
    }

    if (productCategory === 'EGG') {
      if (eggTotalCents <= 0n) {
        return 'Please enter egg quantity and unit price.';
      }
    }

    if (productCategory === 'CHICKEN') {
      if (parseDecimalToScaledBigInt(chickenTotalQuantity, 0) <= 0n || parseDecimalToScaledBigInt(chickenTotalKg, 0) <= 0n || parseDecimalToScaledBigInt(chickenUnitPrice, 0) <= 0n) {
        return 'Please enter chicken total quantity, total kg, and unit price.';
      }
    }

    if (supplierPurchaseTotalCents <= 0n) {
      return 'Supplier purchase total must be greater than zero.';
    }

    if (toCents(discount) < 0n) {
      return 'Discount cannot be negative.';
    }

    if (discountCents > subtotalCents) {
      return 'Discount cannot exceed subtotal.';
    }

    if (paidAmountCents < 0n) {
      return 'Paid amount cannot be negative.';
    }

    if (paidAmountCents > supplierPurchaseTotalCents) {
      return 'Paid amount cannot exceed supplier purchase total.';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      setIsSubmitting(false);
      return;
    }

    const lines = buildPurchaseLines();
    const lineDiscounts = distributeProportionalCents(lines.map((line) => line.lineTotalCents), discountCents);
    const paymentSplits = getPaymentSplits(lines, lineDiscounts);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const formData = new FormData();
      const lineDiscountString = centsToDecimalString(lineDiscounts[index]);
      const lineTotalString = centsToDecimalString(line.lineTotalCents);

      formData.set('partyId', String(selectedPartyId ?? ''));
      formData.set('purchaseDate', purchaseDate);
      formData.set('productCategory', line.productCategory);
      formData.set('productName', line.productName);
      formData.set('quantity', line.quantity);
      formData.set('chickenQuantity', line.productCategory === 'CHICKEN' ? chickenTotalKg : '0');
      formData.set('unit', line.unit);
      formData.set('unitPrice', line.unitPrice);
      const lineNetTotalString = centsToDecimalString(line.lineTotalCents - lineDiscounts[index]);
      formData.set('totalAmount', lineNetTotalString);
      formData.set('discount', lineDiscountString);
      formData.set('paidAmount', paymentSplits[index]);
      formData.set('paymentMethod', 'Cash');
      formData.set('referenceNumber', '');
      formData.set('notes', '');

      const result = await createSupplierPurchase(formData);
      if (!result.success) {
        setFormError(result.message);
        showError(result.message);
        setIsSubmitting(false);
        return;
      }
    }

    success('Supplier purchase recorded successfully.');
    router.refresh();
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const isSubmitDisabled =
    isSubmitting ||
    !selectedPartyId ||
    supplierPurchaseTotalCents <= 0n ||
    paidAmountCents > supplierPurchaseTotalCents ||
    (productCategory === 'EGG' && (Number(eggQuantity || 0) <= 0 || Number(eggUnitPrice || 0) <= 0)) ||
    (productCategory === 'CHICKEN' && (Number(chickenTotalQuantity || 0) <= 0 || Number(chickenTotalKg || 0) <= 0 || Number(chickenUnitPrice || 0) <= 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Supplier Purchase">
      <form onSubmit={handleSubmit} className="mt-2 grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2">
        {formError && (
          <div className="md:col-span-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
            <p className="text-base font-semibold text-rose-900">⚠️ Error</p>
            <p className="mt-1 text-sm text-rose-800">{formError}</p>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Supplier *</label>
          <SearchableCombobox
            options={partyOptions}
            value={selectedPartyId ? String(selectedPartyId) : partyName}
            onValueChange={async (value) => {
              const numericMatch = /^\d+$/.test(value);
              if (numericMatch) {
                const id = Number(value);
                setSelectedPartyId(id);
                const payable = await getSupplierCurrentPayable(id);
                setPreviousDue(payable);
                const opt = partyOptions.find((o) => o.value === String(id));
                setPartyName(opt ? opt.label : '');
              } else {
                setSelectedPartyId(null);
                setPreviousDue(0);
                setPartyName(value);
              }
            }}
            onOptionSelect={async (option) => {
              const id = Number(option.value);
              setSelectedPartyId(id);
              setPartyName(option.label);
              const payable = await getSupplierCurrentPayable(id);
              setPreviousDue(payable);
            }}
            placeholder="Search supplier..."
            emptyText="No supplier found"
            required
          />
          <input type="hidden" name="partyId" value={String(selectedPartyId ?? '')} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Purchase Date *</label>
          <DateInput
            name="purchaseDate"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Product Category *</label>
          <select
            name="productCategory"
            value={productCategory}
            onChange={(e) => setProductCategory(e.target.value as 'EGG' | 'CHICKEN')}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="EGG">Egg</option>
            <option value="CHICKEN">Chicken</option>
          </select>
        </div>

        {showEgg && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium">Egg Quantity *</label>
              <input
                type="number"
                name="eggQuantity"
                min="0"
                step="0.01"
                value={eggQuantity}
                onChange={(e) => setEggQuantity(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Enter egg quantity"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Per Piece Price *</label>
              <input
                type="number"
                name="eggUnitPrice"
                min="0"
                step="0.01"
                value={eggUnitPrice}
                onChange={(e) => setEggUnitPrice(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Enter egg unit price"
              />
            </div>
          </>
        )}

        {showChicken && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium">Chicken Total Quantity *</label>
              <input
                type="number"
                name="chickenTotalQuantity"
                min="0"
                step="1"
                value={chickenTotalQuantity}
                onChange={(e) => setChickenTotalQuantity(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Enter total quantity"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Chicken Total KG *</label>
              <input
                type="number"
                name="chickenTotalKg"
                min="0"
                step="0.01"
                value={chickenTotalKg}
                onChange={(e) => setChickenTotalKg(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Enter total kg"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Per KG Price *</label>
              <input
                type="number"
                name="chickenUnitPrice"
                min="0"
                step="0.01"
                value={chickenUnitPrice}
                onChange={(e) => setChickenUnitPrice(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Enter chicken unit price"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">Discount</label>
          <input
            type="number"
            name="discount"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Paid Amount</label>
          <input
            type="number"
            name="paidAmount"
            min="0"
            step="0.01"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="0.00"
          />
        </div>

        <div className="md:col-span-2 grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 bg-slate-50 rounded-[20px] p-4">
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Subtotal</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(subtotalCents)}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Supplier Purchase Total</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(supplierPurchaseTotalCents)}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Previous Due</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(toCents(previousDue.toFixed(2)))}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Paid Amount</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(paidAmountCents)}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">Final Due</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(finalDueCents)}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitDisabled}>
            {isSubmitting ? 'Saving...' : 'Save Purchase'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
