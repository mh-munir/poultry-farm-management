'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type InitialPayment = {
  id: number;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
  notes: string | null;
};

type PartyPaymentsSectionProps = {
  partyId: number;
  initialPayments: InitialPayment[];
  recordPaymentForParty: (formData: FormData) => Promise<void>;
  updatePaymentForParty: (formData: FormData) => Promise<void>;
  deletePaymentForParty: (formData: FormData) => Promise<void>;
  showForm?: boolean;
  showDeleteButton?: boolean;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

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
        <form action={recordPaymentForParty} className="mt-6 grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-2">
        <input type="hidden" name="partyId" value={partyId} />
        <div>
          <label className="mb-2 block text-sm font-medium">Amount</label>
          <input type="number" min="0.01" step="0.01" name="amount" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="Enter amount" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Payment method</label>
          <select name="paymentMethod" required className="w-full rounded-md border bg-background px-3 py-2">
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="Mobile">Mobile</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Reference number</label>
          <input name="referenceNumber" className="w-full rounded-md border bg-background px-3 py-2" placeholder="Optional" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Status</label>
          <select name="status" defaultValue="COMPLETED" className="w-full rounded-md border bg-background px-3 py-2">
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Notes</label>
          <textarea name="notes" rows={3} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Optional notes" />
        </div>
        <div className="md:col-span-2">
          <Button type="submit">Save payment</Button>
        </div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border">
        <div className="bg-muted/40 px-4 py-3 text-sm font-semibold">Payments</div>
        <table className="min-w-full text-sm">
          <thead className="bg-muted/20 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialPayments.length > 0 ? (
              initialPayments.map((payment) => (
                <tr key={payment.id} className="border-t">
                  {editingPaymentId === payment.id ? (
                    <>
                      <td colSpan={7} className="px-4 py-4">
                        <form action={updatePaymentForParty} className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-2">
                          <input type="hidden" name="partyId" value={partyId} />
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <div>
                            <label className="mb-1 block text-xs font-medium">Amount</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              name="amount"
                              required
                              value={drafts[payment.id]?.amount ?? payment.amount}
                              onChange={(event) => handleDraftChange(payment.id, 'amount', event.target.value)}
                              className="w-full rounded-md border bg-background px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Method</label>
                            <select
                              name="paymentMethod"
                              value={drafts[payment.id]?.paymentMethod ?? payment.paymentMethod}
                              onChange={(event) => handleDraftChange(payment.id, 'paymentMethod', event.target.value)}
                              className="w-full rounded-md border bg-background px-3 py-2"
                            >
                              <option value="Cash">Cash</option>
                              <option value="Bank">Bank</option>
                              <option value="Mobile">Mobile</option>
                              <option value="Cheque">Cheque</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Reference</label>
                            <input
                              name="referenceNumber"
                              value={drafts[payment.id]?.referenceNumber ?? ''}
                              onChange={(event) => handleDraftChange(payment.id, 'referenceNumber', event.target.value)}
                              className="w-full rounded-md border bg-background px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">Status</label>
                            <select
                              name="status"
                              value={drafts[payment.id]?.status ?? payment.status}
                              onChange={(event) => handleDraftChange(payment.id, 'status', event.target.value)}
                              className="w-full rounded-md border bg-background px-3 py-2"
                            >
                              <option value="COMPLETED">Completed</option>
                              <option value="PENDING">Pending</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium">Notes</label>
                            <textarea
                              name="notes"
                              rows={3}
                              value={drafts[payment.id]?.notes ?? ''}
                              onChange={(event) => handleDraftChange(payment.id, 'notes', event.target.value)}
                              className="w-full rounded-md border bg-background px-3 py-2"
                            />
                          </div>
                          <div className="md:col-span-2 flex gap-2">
                            <Button type="submit" size="sm">Save</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditingPaymentId(null)}>Cancel</Button>
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
                            Edit
                          </Button>
                          {showDeleteButton ? (
                            <form action={deletePaymentForParty}>
                              <input type="hidden" name="partyId" value={partyId} />
                              <input type="hidden" name="paymentId" value={payment.id} />
                              <Button type="submit" variant="destructive" size="sm">
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Delete
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
      </div>
    </div>
  );
}
