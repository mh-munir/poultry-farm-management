'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/i18n/provider';
import { getPartyAccountSummary, getSupplierOptions, paySupplierPayment } from '@/features/parties/actions';
import { DateInput } from '@/components/ui/date-input';
import { todayDateInputValueBD as todayDateStr } from '@/lib/dates';
import { formatLocalizedCurrency } from '@/lib/localized-formatters';

type PaySupplierModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PaySupplierModal({ open, onOpenChange }: PaySupplierModalProps) {
  const { dict, locale } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partyOptions, setPartyOptions] = useState<ComboboxOption[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [currentPayable, setCurrentPayable] = useState(0);
  const [customerDue, setCustomerDue] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => todayDateStr());
  const router = useRouter();
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (open) {
      getSupplierOptions().then((options: Array<{ id: number; name: string }>) => {
        setPartyOptions(options.map((o) => ({ value: String(o.id), label: o.name })));
      });
      setSelectedPartyId(null);
      setCurrentPayable(0);
      setCustomerDue(0);
      setPaymentAmount('');
      setPaymentDate(todayDateStr());
    }
  }, [open]);

  const handlePartyChange = async (value: string) => {
    const id = Number(value);
    if (!Number.isFinite(id) || id <= 0) {
      setSelectedPartyId(null);
      setCurrentPayable(0);
    } else {
      setSelectedPartyId(id);
      const summary = await getPartyAccountSummary(id);
      setCurrentPayable(Number(summary.supplierPayable));
      setCustomerDue(Number(summary.customerDue));
    }
    setPaymentAmount('');
  };

  const enteredAmount = Number(paymentAmount) || 0;
  const payableSettlement = Math.min(currentPayable, enteredAmount);
  const supplierAdvance = Math.max(0, enteredAmount - currentPayable);
  const remainingPayable = Math.max(0, currentPayable - enteredAmount);
  const customerDueAfterPayment = customerDue + supplierAdvance;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await paySupplierPayment(formData);
    setIsSubmitting(false);

    if (!result.success) {
      showError(result.message);
      return;
    }

    success(result.message);
    router.refresh();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={dict.common.paySupplier}>
      <form onSubmit={handleSubmit} className="mt-2 grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2">
        <input type="hidden" name="status" value="COMPLETED" />
        <input type="hidden" name="paymentMethod" value="Cash" />

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">{dict.common.partyName}</label>
          <SearchableCombobox
            options={partyOptions}
            value={String(selectedPartyId ?? '')}
            onValueChange={handlePartyChange}
            placeholder={dict.forms.searchSupplier}
            emptyText={dict.stock.noCompanyFound}
            required
          />
          <input type="hidden" name="partyId" value={String(selectedPartyId ?? '')} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{dict.common.paymentDate}</label>
          <DateInput
            name="paymentDate"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            className="w-full h-[50px] rounded-[12px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{dict.stock.paymentAmount}</label>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
            className="w-full h-[50px] rounded-[12px] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            placeholder={dict.forms.enterAmount}
          />
        </div>

        <div className="md:col-span-2 grid gap-3 md:grid-cols-3 bg-slate-50 rounded-[20px] p-4">
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">{dict.common.currentDue}</label>
            <input
              type="text"
              readOnly
              value={`৳ ${currentPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">{dict.stock.paymentAmount}</label>
            <input
              type="text"
              readOnly
              value={`৳ ${(Number(paymentAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold text-slate-950"
            />
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-medium text-slate-500">{dict.common.remainingDue}</label>
            <input
              type="text"
              readOnly
              value={`৳ ${remainingPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              className={`mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-3 text-right text-lg font-semibold ${remainingPayable < 0 ? 'text-red-600' : remainingPayable === 0 && paymentAmount ? 'text-emerald-600' : 'text-slate-950'}`}
            />
          </div>
        </div>

        <div className="md:col-span-2 grid gap-3 md:grid-cols-2 lg:grid-cols-4 bg-slate-50 rounded-[20px] p-4">
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Customer Due</p>
            <p className="mt-3 text-right text-lg font-semibold text-slate-950">{formatLocalizedCurrency(customerDue, locale)}</p>
            <p className="mt-2 text-xs text-slate-500">This party owes you</p>
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Supplier Payable Settlement</p>
            <p className="mt-3 text-right text-lg font-semibold text-slate-950">{formatLocalizedCurrency(payableSettlement, locale)}</p>
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Customer Due After Payment</p>
            <p className="mt-3 text-right text-lg font-semibold text-slate-950">{formatLocalizedCurrency(customerDueAfterPayment, locale)}</p>
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Remaining Supplier Payable</p>
            <p className="mt-3 text-right text-lg font-semibold text-slate-950">{formatLocalizedCurrency(remainingPayable, locale)}</p>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {dict.common.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedPartyId || !paymentAmount || Number(paymentAmount) <= 0}>
            {isSubmitting ? 'Saving...' : 'Save Payment'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
