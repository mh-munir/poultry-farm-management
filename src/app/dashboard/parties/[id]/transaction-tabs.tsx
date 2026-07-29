'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PartyPaymentsSection } from './party-payments-section';

type ProductRow = {
  id: string;
  invoiceNumber: string;
  transactionDate: Date;
  transactionType: string;
  mediaName: string | null;
  productName: string;
  productType: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  details: string | null;
};

type PaymentRow = {
  id: number;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
  notes: string | null;
};

type LedgerRow = {
  id: number;
  entryDate: Date;
  entryType: string;
  amount: string;
  runningBalance: string;
  description: string | null;
  referenceNumber: string | null;
};

type TransactionTabsProps = {
  buyRows: ProductRow[];
  payments: PaymentRow[];
  ledgerEntries: LedgerRow[];
  partyId: number;
  recordPaymentForParty: (formData: FormData) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  updatePaymentForParty: (formData: FormData) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  deletePaymentForParty: (formData: FormData) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
};

function formatCurrency(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `৳ ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)}`;
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function TransactionTabs({
  buyRows,
  payments,
  ledgerEntries,
  partyId,
  recordPaymentForParty,
  updatePaymentForParty,
  deletePaymentForParty
}: TransactionTabsProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'payments' | 'ledger'>('buy');

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('buy')}
          className={activeTab === 'buy' ? 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-badge font-semibold bg-primary text-primary-foreground transition-colors duration-200' : 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-badge font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors duration-200'}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={activeTab === 'payments' ? 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-badge font-semibold bg-primary text-primary-foreground transition-colors duration-200' : 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-badge font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors duration-200'}
        >
          Payments
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={activeTab === 'ledger' ? 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-badge font-semibold bg-primary text-primary-foreground transition-colors duration-200' : 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-badge font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors duration-200'}
        >
          Ledger
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'buy' ? (
          buyRows.length > 0 ? (
            <div className="overflow-hidden rounded-xl border min-w-0">
              <div className="bg-muted/40 px-4 py-3 text-card-title">Buy History</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-table-body">
                  <thead className="bg-muted/10 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium text-table-header">Date</th>
                      <th className="px-4 py-3 font-medium text-table-header">Product</th>
                      <th className="px-4 py-3 font-medium text-table-header">Type</th>
                      <th className="px-4 py-3 font-medium text-table-header">Quantity</th>
                      <th className="px-4 py-3 font-medium text-table-header">Unit</th>
                      <th className="px-4 py-3 font-medium text-table-header">Unit price</th>
                      <th className="px-4 py-3 font-medium text-table-header">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyRows.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">{formatDate(row.transactionDate)}</td>
                        <td className="px-4 py-3">{row.productName}</td>
                        <td className="px-4 py-3">{row.productType}</td>
                        <td className="px-4 py-3">{row.quantity}</td>
                        <td className="px-4 py-3">{row.unit}</td>
                        <td className="px-4 py-3">{formatCurrency(row.unitPrice)}</td>
                        <td className="px-4 py-3">{formatCurrency(row.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No buy entries available yet.</div>
          )
        ) : null}

        {activeTab === 'payments' ? (
          <PartyPaymentsSection
            partyId={partyId}
            initialPayments={payments}
            recordPaymentForParty={recordPaymentForParty}
            updatePaymentForParty={updatePaymentForParty}
            deletePaymentForParty={deletePaymentForParty}
            showForm={false}
            showDeleteButton={false}
          />
        ) : null}

        {activeTab === 'ledger' ? (
          ledgerEntries.length > 0 ? (
            <div className="overflow-hidden rounded-xl border min-w-0">
              <div className="bg-muted/40 px-4 py-3 text-card-title">Ledger</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-table-body">
                  <thead className="bg-muted/10 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium text-table-header">Date</th>
                      <th className="px-4 py-3 font-medium text-table-header">Type</th>
                      <th className="px-4 py-3 font-medium text-table-header">Amount</th>
                      <th className="px-4 py-3 font-medium text-table-header">Running Balance</th>
                      <th className="px-4 py-3 font-medium text-table-header">Reference</th>
                      <th className="px-4 py-3 font-medium text-table-header">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">{formatDate(entry.entryDate)}</td>
                        <td className="px-4 py-3">{entry.entryType}</td>
                        <td className="px-4 py-3">{formatCurrency(entry.amount)}</td>
                        <td className="px-4 py-3">{formatCurrency(entry.runningBalance)}</td>
                        <td className="px-4 py-3">{entry.referenceNumber ?? '—'}</td>
                        <td className="px-4 py-3">{entry.description ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No ledger entries available yet.</div>
          )
        ) : null}
      </div>
    </div>
  );
}