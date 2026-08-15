'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/provider';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { formatDateBD as formatDate } from '@/lib/dates';

type InitialPayment = {
  id: number;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
  notes: string | null;
};

type PartyPaymentActionResult = { success: boolean; message: string };

type PartyPaymentsSectionProps = {
  partyId: number;
  initialPayments: InitialPayment[];
  recordPaymentForParty: (formData: FormData) => Promise<PartyPaymentActionResult> | PartyPaymentActionResult;
  updatePaymentForParty: (formData: FormData) => Promise<PartyPaymentActionResult> | PartyPaymentActionResult;
  deletePaymentForParty: (formData: FormData) => Promise<PartyPaymentActionResult> | PartyPaymentActionResult;
  showForm?: boolean;
  showDeleteButton?: boolean;
};



function formatCurrency(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  return `৳ ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)}`;
}

export function PartyPaymentsSection({
  partyId,
  initialPayments,
  recordPaymentForParty,
  updatePaymentForParty,
  deletePaymentForParty,
  showForm = true,
  showDeleteButton = true
}: PartyPaymentsSectionProps) {
  const { dict } = useLocale();
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Partial<InitialPayment>>>({});

  const handleDraftChange = (paymentId: number, field: keyof InitialPayment, value: string) => {
    setDrafts((current) => ({
      ...current,
      [paymentId]: {
        ...current[paymentId],
        [field]: value
      }
    }));
  };

  const startEditing = (payment: InitialPayment) => {
    setEditingPaymentId(payment.id);
    setDrafts((current) => ({
      ...current,
      [payment.id]: {
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber ?? '',
        status: payment.status,
        notes: payment.notes ?? ''
      }
    }));
  };

  return (
    <div>
      {showForm && (
        <form action={async (formData: FormData) => {
          await recordPaymentForParty(formData);
        }} className="mt-6 grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-2">
        <input type="hidden" name="partyId" value={partyId} />
        <div>
          <label className="mb-2 block text-form-label">{dict.common.amount}</label>
          <input type="number" min="0.01" step="0.01" name="amount" required className="w-full rounded-lg border bg-background px-4 py-2.5 text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" placeholder={dict.forms.enterAmount} />
        </div>
        <div>
          <label className="mb-2 block text-form-label">{dict.common.payment}</label>
          <select name="paymentMethod" required className="w-full form-select">
            <option value="Cash">{dict.paymentMethods.cash}</option>
            <option value="Bank">{dict.paymentMethods.bank}</option>
            <option value="Mobile">{dict.paymentMethods.mobile}</option>
            <option value="Cheque">{dict.paymentMethods.cheque}</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-form-label">{dict.common.referenceNumber}</label>
          <input name="referenceNumber" className="w-full rounded-lg border bg-background px-4 py-2.5 text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" placeholder={dict.forms.optional} />
        </div>
        <div>
          <label className="mb-2 block text-form-label">{dict.common.status}</label>
          <select name="status" defaultValue="COMPLETED" className="w-full form-select">
            <option value="COMPLETED">{dict.paymentStatus.completed}</option>
            <option value="PENDING">{dict.paymentStatus.pending}</option>
            <option value="CANCELLED">{dict.paymentStatus.cancelled}</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-form-label">{dict.common.notes}</label>
          <textarea name="notes" rows={3} className="w-full rounded-lg border bg-background px-4 py-2.5 text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" placeholder={dict.forms.optionalNotes} />
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="submit">{dict.common.savePayment}</Button>
        </div>
        </form>
      )}

      <div className="mt-6 overflow-visible rounded-xl border bg-card">
        <div className="bg-muted/40 px-4 py-3 text-sm font-semibold">Payments</div>
        <ResponsiveTable stickyLastColumn minWidth="980px">
        <table className="min-w-full text-table-body">
          <thead className="bg-muted/20 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{dict.common.date}</th>
              <th className="px-4 py-3 font-medium">{dict.common.amount}</th>
              <th className="px-4 py-3 font-medium">{dict.common.payment}</th>
              <th className="px-4 py-3 font-medium">{dict.common.referenceNumber}</th>
              <th className="px-4 py-3 font-medium">{dict.common.status}</th>
              <th className="px-4 py-3 font-medium">{dict.common.notes}</th>
              <th className="px-4 py-3 font-medium">{dict.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {initialPayments.length > 0 ? (
              initialPayments.map((payment) => (
                <tr key={payment.id} className="border-t">
                  {editingPaymentId === payment.id ? (
                    <>
                      <td colSpan={7} className="px-4 py-4">
                        <form action={async (formData: FormData) => {
                          await updatePaymentForParty(formData);
                        }} className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-2">
                          <input type="hidden" name="partyId" value={partyId} />
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <div>
                            <label className="mb-1 block text-form-label">{dict.common.amount}</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              name="amount"
                              required
                              value={drafts[payment.id]?.amount ?? payment.amount}
                              onChange={(event) => handleDraftChange(payment.id, 'amount', event.target.value)}
                              className="w-full rounded-lg border bg-background px-3 py-2 text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-form-label">{dict.common.payment}</label>
                            <select
                              name="paymentMethod"
                              value={drafts[payment.id]?.paymentMethod ?? payment.paymentMethod}
                              onChange={(event) => handleDraftChange(payment.id, 'paymentMethod', event.target.value)}
                              className="w-full form-select"
                            >
                              <option value="Cash">{dict.paymentMethods.cash}</option>
                              <option value="Bank">{dict.paymentMethods.bank}</option>
                              <option value="Mobile">{dict.paymentMethods.mobile}</option>
                              <option value="Cheque">{dict.paymentMethods.cheque}</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-form-label">{dict.common.referenceNumber}</label>
                            <input
                              name="referenceNumber"
                              value={drafts[payment.id]?.referenceNumber ?? ''}
                              onChange={(event) => handleDraftChange(payment.id, 'referenceNumber', event.target.value)}
                              className="w-full rounded-lg border bg-background px-3 py-2 text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-form-label">{dict.common.status}</label>
                            <select
                              name="status"
                              value={drafts[payment.id]?.status ?? payment.status}
                              onChange={(event) => handleDraftChange(payment.id, 'status', event.target.value)}
                              className="w-full form-select"
                            >
                              <option value="COMPLETED">{dict.paymentStatus.completed}</option>
                              <option value="PENDING">{dict.paymentStatus.pending}</option>
                              <option value="CANCELLED">{dict.paymentStatus.cancelled}</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-form-label">{dict.common.notes}</label>
                            <textarea
                              name="notes"
                              rows={3}
                              value={drafts[payment.id]?.notes ?? ''}
                              onChange={(event) => handleDraftChange(payment.id, 'notes', event.target.value)}
                              className="w-full rounded-lg border bg-background px-3 py-2 text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            />
                          </div>
                          <div className="md:col-span-2 flex gap-2">
                            <Button type="submit" size="sm">{dict.common.save}</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditingPaymentId(null)}>{dict.common.cancel}</Button>
                          </div>
                        </form>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">{formatDate(payment.paymentDate)}</td>
                      <td className="px-4 py-3">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3">{payment.paymentMethod}</td>
                      <td className="px-4 py-3">{payment.referenceNumber ?? '—'}</td>
                      <td className="px-4 py-3">{payment.status}</td>
                      <td className="px-4 py-3">{payment.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => startEditing(payment)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            {dict.common.edit}
                          </Button>
                          {showDeleteButton ? (
                            <form action={async (formData: FormData) => {
                              await deletePaymentForParty(formData);
                            }}>
                              <input type="hidden" name="partyId" value={partyId} />
                              <input type="hidden" name="paymentId" value={payment.id} />
                              <Button type="submit" variant="destructive" size="sm">
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                {dict.common.delete}
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr className="border-t">
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No payment history available yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        </ResponsiveTable>
      </div>
    </div>
  );
}
