'use client';

import { useEffect, useState, useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { PartyPaymentsSection } from './party-payments-section';
import { DEFAULT_PAGE_SIZE } from '@/config/pagination';
import { DateInput } from '@/components/ui/date-input';
import { formatDateBD as formatDate, toDateInputValueBD as toDateInputValue } from '@/lib/dates';

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
  transactionId?: number;
};

type TransactionTabsProps = {
  payments: PaymentRow[];
  ledgerEntries: LedgerRow[];
  partyId: number;
  recordPaymentForParty: (formData: FormData) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  updatePaymentForParty: (formData: FormData) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  deletePaymentForParty: (formData: FormData) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
};

type HistoryTab = 'all' | 'payments' | 'adjustments' | 'ledger';

type HistoryRow = {
  id: number;
  date: Date;
  type: string;
  category: 'sales' | 'purchase' | 'payments' | 'adjustments' | 'ledger';
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  status: string;
  referenceNumber: string | null;
  transactionId?: number;
};

const tabs: Array<{ value: HistoryTab; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'payments', label: 'Payments' },
  { value: 'adjustments', label: 'Adjustments' },
  { value: 'ledger', label: 'Ledger' }
];

function formatCurrency(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `Tk ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)}`;
}

// using centralized Bangladesh-aware date utilities: `formatDate`, `toDateInputValue`, `todayDateStr`

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getLedgerCategory(entryType: string): HistoryRow['category'] {
  if (entryType === 'SALE') return 'sales';
  if (entryType === 'PURCHASE') return 'purchase';
  if (entryType.startsWith('PAYMENT')) return 'payments';
  if (entryType.includes('ADJUST')) return 'adjustments';
  return 'ledger';
}

function getStatus(row: Pick<HistoryRow, 'category' | 'runningBalance'>) {
  if (row.runningBalance === 0) return 'Cleared';
  if (row.category === 'payments') return 'Posted';
  if (row.runningBalance > 0) return 'Open';
  return 'Settled';
}

function statusClass(status: string) {
  if (status === 'Cleared') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Posted') return 'bg-sky-100 text-sky-700';
  if (status === 'Settled') return 'bg-slate-100 text-slate-700';
  return 'bg-amber-100 text-amber-700';
}

function buildExportCsv(rows: HistoryRow[]) {
  const header = ['Date', 'Type', 'Category', 'Description', 'Debit', 'Credit', 'Running Balance', 'Status', 'Reference'];
  const body = rows.map((row) => [
    formatDate(row.date),
    titleCase(row.type),
    titleCase(row.category),
    row.description,
    row.debit.toFixed(2),
    row.credit.toFixed(2),
    row.runningBalance.toFixed(2),
    row.status,
    row.referenceNumber ?? ''
  ]);

  return [header, ...body]
    .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function TransactionTabs({
  payments,
  ledgerEntries,
  partyId,
  recordPaymentForParty,
  updatePaymentForParty,
  deletePaymentForParty
}: TransactionTabsProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showPaymentTools, setShowPaymentTools] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, dateFrom, dateTo]);

  const historyRows = useMemo<HistoryRow[]>(() => ledgerEntries.map((entry) => {
    const amount = Number(entry.amount ?? 0);
    const category = getLedgerCategory(entry.entryType);
    const row = {
      id: entry.id,
      date: new Date(entry.entryDate),
      type: entry.entryType,
      category,
      description: entry.description ?? entry.referenceNumber ?? titleCase(entry.entryType),
      debit: amount > 0 ? amount : 0,
      credit: amount < 0 ? Math.abs(amount) : 0,
      runningBalance: Number(entry.runningBalance ?? 0),
      status: '',
      referenceNumber: entry.referenceNumber,
      transactionId: entry.transactionId ?? undefined
    };

    row.status = getStatus(row);
    return row;
  }), [ledgerEntries]);

  const filteredRows = useMemo(() => historyRows.filter((row) => {
    if (activeTab !== 'all' && row.category !== activeTab) return false;

    const rowDate = new Date(toDateInputValue(row.date));
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    if (fromDate && rowDate.getTime() < fromDate.getTime()) return false;
    if (toDate && rowDate.getTime() > toDate.getTime()) return false;
    return true;
  }), [activeTab, dateFrom, dateTo, historyRows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / DEFAULT_PAGE_SIZE));
  const currentPageSafe = Math.min(Math.max(currentPage, 1), pageCount);
  const visibleRows = filteredRows.slice((currentPageSafe - 1) * DEFAULT_PAGE_SIZE, currentPageSafe * DEFAULT_PAGE_SIZE);

  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(buildExportCsv(filteredRows))}`;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Transaction History</h2>
          <p className="mt-1 text-card-subtitle">Ledger-backed activity with running balance</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <DateInput
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Start date"
              />
            </div>
            <div className="flex flex-col gap-1">
              <DateInput
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="End date"
              />
            </div>
          </div>
          <Button type="button" variant="outline" className="h-[42px]" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Clear
          </Button>
          <Button asChild variant="outline" className="h-[42px]">
            <a href={csvHref} download={`party-${partyId}-transactions.csv`}>
              <Download className="h-4 w-4" />
              Export
            </a>
          </Button>
        </div>
      </div>

      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={activeTab === tab.value
                ? 'inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm'
                : 'inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground'}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="overflow-visible rounded-2xl border border-border">
          <ResponsiveTable stickyLastColumn minWidth="980px">
            <table className="min-w-[980px] w-full text-table-body">
              <thead className="bg-muted/30 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-table-header">Date</th>
                  <th className="px-4 py-3 text-table-header">Type</th>
                  <th className="px-4 py-3 text-table-header">Category</th>
                  <th className="px-4 py-3 text-table-header">Description</th>
                  <th className="px-4 py-3 text-right text-table-header">Debit</th>
                  <th className="px-4 py-3 text-right text-table-header">Credit</th>
                  <th className="px-4 py-3 text-right text-table-header">Running Balance</th>
                  <th className="px-4 py-3 text-table-header">Status</th>
                  <th className="px-4 py-3 text-table-header">Action</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {visibleRows.length > 0 ? visibleRows.map((row) => (
                  <tr key={row.id} className="border-t border-border hover:bg-muted/20">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(row.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{titleCase(row.type)}</td>
                    <td className="px-4 py-3">{titleCase(row.category)}</td>
                    <td className="min-w-64 px-4 py-3 text-muted-foreground">{row.description}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(row.runningBalance)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.transactionId ? (
                        <Button asChild variant="outline" size="icon" className="h-9 w-9">
                          <a
                            href={`/dashboard/transactions/${row.transactionId}/print`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Print invoice"
                            title="Print invoice"
                          >
                            <Printer className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No transaction history found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
        {pageCount > 1 && (
          <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-gradient-to-r from-background to-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Showing</span>
              <span className="font-semibold text-foreground">{visibleRows.length}</span>
              <span className="text-muted-foreground">of</span>
              <span className="font-semibold text-foreground">{filteredRows.length}</span>
              <span className="text-muted-foreground">transactions</span>
            </div>
            <Pagination currentPage={currentPageSafe} totalPages={pageCount} onPageChange={setCurrentPage} className="justify-center sm:justify-end" />
          </div>
        )}
        {activeTab === 'payments' && showPaymentTools ? (
          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-card-title">Payment Tools</h3>
                <p className="text-card-subtitle">Edit existing payment records</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPaymentTools(false)}>
                Hide
              </Button>
            </div>
            <PartyPaymentsSection
              partyId={partyId}
              initialPayments={payments}
              recordPaymentForParty={recordPaymentForParty}
              updatePaymentForParty={updatePaymentForParty}
              deletePaymentForParty={deletePaymentForParty}
              showForm={false}
              showDeleteButton={false}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
