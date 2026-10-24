'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/i18n/provider';
import { DateInput } from '@/components/ui/date-input';
import { todayDateInputValueBD as todayDateStr } from '@/lib/dates';

type Props = {
  partyId: number;
  partyName: string;
  title: string;
  buttonLabel: string;
  dueLabel: string;
  dueAmount: number;
  toastSuccessMessage: string;
  recordPaymentForParty: (formData: FormData) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  buttonClassName?: string;
  buttonLeading?: ReactNode;
  buttonTrailing?: ReactNode;
};

export default function PaymentFormDialog({
  partyId,
  partyName,
  title,
  buttonLabel,
  dueLabel,
  dueAmount,
  toastSuccessMessage,
  recordPaymentForParty,
  buttonClassName,
  buttonLeading,
  buttonTrailing
}: Props) {
  const { dict } = useLocale();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDate, setPaymentDate] = useState(todayDateStr());
  const router = useRouter();
  const { success, error: showError } = useToast();

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        {buttonLeading ?? <Wallet className="mr-2 h-4 w-4" />}
        {buttonLabel}
        {buttonTrailing}
      </Button>

      <Dialog open={open} onOpenChange={setOpen} title={title}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            const formData = new FormData(event.currentTarget);
            const result = await recordPaymentForParty(formData);
            setIsSubmitting(false);

            if (!result.success) {
              showError(result.message);
              return;
            }

            success(toastSuccessMessage);
            setOpen(false);
            router.refresh();
          }}
          className="mt-2 grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-2"
        >
          <input type="hidden" name="partyId" value={String(partyId)} />
          <input type="hidden" name="status" value="COMPLETED" />
           <div className="md:col-span-2 rounded-xl border border-border bg-slate-50 p-4">
            <p className="text-form-label text-muted-foreground">{dict.common.partyName}</p>
            <p className="mt-2 text-[15px] font-semibold text-foreground">{partyName}</p>
            <p className="mt-3 text-form-label text-muted-foreground">{dueLabel}</p>
            <p className="mt-1 text-base font-semibold">৳ {dueAmount.toFixed(2)}</p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-form-label">{dict.stock.paymentAmount}</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="amount"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder={dict.forms.enterAmount}
            />
          </div>

          <div>
            <label className="mb-2 block text-form-label">{dict.common.paymentDate}</label>
            <DateInput
              name="paymentDate"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>

          <input type="hidden" name="paymentMethod" value="Cash" />

          <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? dict.common.processing : dict.common.savePayment}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
