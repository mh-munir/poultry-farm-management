'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { getCompaniesByType, getCompanyCurrentDue, recordPaymentForCompany } from '@/features/companies/actions';

type PayCompanyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCompanyId?: number;
};

export function PayCompanyModal({ open, onOpenChange, preselectedCompanyId }: PayCompanyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyOptions, setCompanyOptions] = useState<ComboboxOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(preselectedCompanyId ?? null);
  const [currentDue, setCurrentDue] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const router = useRouter();
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (open) {
      const loadCompanies = async () => {
        const [feedCompanies, medicineCompanies] = await Promise.all([
          getCompaniesByType('FEED'),
          getCompaniesByType('MEDICINE')
        ]);
        const all = [...feedCompanies, ...medicineCompanies];
        const options: ComboboxOption[] = all.map((c) => ({ value: String(c.id), label: c.name }));
        setCompanyOptions(options);

        if (preselectedCompanyId && all.some((c) => c.id === preselectedCompanyId)) {
          setSelectedCompanyId(preselectedCompanyId);
          const due = await getCompanyCurrentDue(preselectedCompanyId);
          setCurrentDue(due);
        } else if (!preselectedCompanyId) {
          setSelectedCompanyId(null);
          setCurrentDue(0);
        }
      };

      loadCompanies();
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, preselectedCompanyId]);

  const handleCompanyChange = async (value: string) => {
    const matchedByValue = companyOptions.find((c) => c.value === value);
    const matchedByLabel = companyOptions.find((c) => c.label.toLowerCase() === value.toLowerCase());
    const matched = matchedByValue ?? matchedByLabel;

    if (matched) {
      const id = Number(matched.value);
      setSelectedCompanyId(id);
      const due = await getCompanyCurrentDue(id);
      setCurrentDue(due);
    } else {
      setSelectedCompanyId(null);
      setCurrentDue(0);
    }
    setPaymentAmount('');
  };

  const remainingDue = currentDue - (Number(paymentAmount) || 0);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await recordPaymentForCompany(formData);
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
    <Dialog open={open} onOpenChange={onOpenChange} title="Pay Company">
      <form onSubmit={handleSubmit} className="mt-2 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="companyId" value={String(selectedCompanyId ?? '')} />
        <input type="hidden" name="status" value="COMPLETED" />
        <input type="hidden" name="paymentMethod" value="Cash" />

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Company</label>
          <SearchableCombobox
            options={companyOptions}
            value={String(selectedCompanyId ?? '')}
            onValueChange={handleCompanyChange}
            placeholder="Search company..."
            emptyText="No company found"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Payment Date</label>
          <input
            type="date"
            name="paymentDate"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Payment Amount</label>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Enter amount"
          />
        </div>

        <div className="md:col-span-2 rounded-2xl border border-border bg-slate-50 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Due</p>
              <p className="mt-1 text-lg font-semibold">৳ {currentDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payment</p>
              <p className="mt-1 text-lg font-semibold">৳ {(Number(paymentAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Remaining Due</p>
              <p className={`mt-1 text-lg font-semibold ${remainingDue < 0 ? 'text-red-600' : remainingDue === 0 && paymentAmount ? 'text-emerald-600' : ''}`}>
                ৳ {remainingDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedCompanyId || !paymentAmount || Number(paymentAmount) <= 0 || remainingDue < 0}>
            {isSubmitting ? 'Saving...' : 'Save Payment'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
