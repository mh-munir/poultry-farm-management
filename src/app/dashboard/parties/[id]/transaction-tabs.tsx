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
import { useLocale } from '@/i18n/provider';

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

const tabs: Array<{ value: HistoryTab }> = [
  { value: 'all' },
  { value: 'payments' },
  { value: 'adjustments' },
  { value: 'ledger' }
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
  if (row.runningBalance === 0) return 'CLEARED';
  if (row.category === 'payments') return 'POSTED';
  if (row.runningBalance > 0) return 'OPEN';
  return 'SETTLED';
}

function statusClass(status: string) {
  if (status === 'CLEARED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'POSTED') return 'bg-sky-100 text-sky-700';
  if (status === 'SETTLED') return 'bg-slate-100 text-slate-700';
  return 'bg-amber-100 text-amber-700';
}

function buildExportCsv(
  rows: HistoryRow[],
  labels: { headers: string[]; type: (value: string) => string; category: (value: HistoryRow['category']) => string; status: (value: string) => string }
) {
  const { headers, type, category, status } = labels;
  const body = rows.map((row) => [
    formatDate(row.date),
    type(row.type),
    category(row.category),
    row.description,
    row.debit.toFixed(2),
    row.credit.toFixed(2),
    row.runningBalance.toFixed(2),
    status(row.status),
    row.referenceNumber ?? ''
  ]);

  return [headers, ...body]
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
  const { dict } = useLocale();

  const getCategoryLabel = (category: HistoryRow['category']) => {
    if (category === 'sales') return dict.common.sales;
    if (category === 'purchase') return dict.common.purchases;
    if (category === 'payments') return dict.common.payments;
    if (category === 'adjustments') return dict.common.adjustments;
    return dict.common.ledger;
  };
  const getStatusLabel = (status: string) => {
    if (status === 'CLEARED') return dict.common.cleared;
    if (status === 'POSTED') return dict.paymentStatus.completed;
    if (status === 'SETTLED') return dict.common.settled;
    return dict.common.open;
  };
  const getTypeLabel = (type: string) => {
    if (type === 'SALE' || type === 'SALE_REVERSAL') return dict.common.sales;
    if (type === 'PURCHASE' || type === 'PURCHASE_REVERSAL') return dict.common.purchases;
    if (type === 'PAYMENT_RECEIVED') return dict.common.customerPayment;
    if (type === 'PAYMENT_PAID') return dict.common.paySupplier;
    if (type === 'PAYMENT_REVERSAL') return dict.common.payment;
    if (type === 'OPENING_BALANCE') return dict.common.openingBalanceLabel;
    return titleCase(type);
  };

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

  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(buildExportCsv(filteredRows, {
    headers: [
      dict.common.date,
      dict.common.type,
      dict.common.category,
      dict.tableHeaders.description,
      dict.common.debit,
      dict.common.credit,
      dict.common.runningBalance,
      dict.common.status,
      dict.common.referenceNumber
    ],
    type: getTypeLabel,
    category: getCategoryLabel,
    status: getStatusLabel
  }))}`;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{dict.common.transactionHistory}</h2>
          <p className="mt-1 text-card-subtitle">{dict.common.ledgerBackedActivityWithRunningBalance}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <DateInput
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={dict.common.startDate}
              />
            </div>
            <div className="flex flex-col gap-1">
              <DateInput
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-[42px] rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={dict.common.endDate}
              />
            </div>
          </div>
          <Button type="button" variant="outline" className="h-[42px]" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            {dict.common.clear}
          </Button>
          <Button asChild variant="outline" className="h-[42px]">
            <a href={csvHref} download={`party-${partyId}-transactions.csv`}>
              <Download className="h-4 w-4" />
              {dict.common.export}
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
              {tab.value === 'all' ? dict.common.allTab
                : tab.value === 'payments' ? dict.common.payments
                  : tab.value === 'adjustments' ? dict.common.adjustments
                    : dict.common.ledger}
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
                  <th className="px-4 py-3 text-table-header">{dict.common.date}</th>
                  <th className="px-4 py-3 text-table-header">{dict.common.type}</th>
                  <th className="px-4 py-3 text-table-header">{dict.common.category}</th>
                  <th className="px-4 py-3 text-table-header">{dict.common.partyDescription}</th>
                  <th className="px-4 py-3 text-right text-table-header">{dict.common.debit}</th>
                  <th className="px-4 py-3 text-right text-table-header">{dict.common.credit}</th>
                  <th className="px-4 py-3 text-right text-table-header">{dict.common.runningBalance}</th>
                  <th className="px-4 py-3 text-table-header">{dict.common.status}</th>
                  <th className="px-4 py-3 text-table-header">{dict.common.actions}</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {visibleRows.length > 0 ? visibleRows.map((row) => (
                  <tr key={row.id} className="border-t border-border hover:bg-muted/20">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(row.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{getTypeLabel(row.type)}</td>
                    <td className="px-4 py-3">{getCategoryLabel(row.category)}</td>
                    <td className="min-w-64 px-4 py-3 text-muted-foreground">{row.description}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(row.runningBalance)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.transactionId ? (
                        <Button asChild variant="outline" size="icon" className="h-9 w-9">
                          <a
                            href={`/dashboard/transactions/${row.transactionId}/print`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={dict.common.printInvoice}
                            title={dict.common.printInvoice}
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
                      {dict.common.noTransactionHistoryForFilter}
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
              {dict.common.showingTransactions
                .replace('{shown}', String(visibleRows.length))
                .replace('{total}', String(filteredRows.length))}
            </div>
            <Pagination currentPage={currentPageSafe} totalPages={pageCount} onPageChange={setCurrentPage} className="justify-center sm:justify-end" />
          </div>
        )}
        {activeTab === 'payments' && showPaymentTools ? (
          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-card-title">{dict.common.paymentTools}</h3>
                <p className="text-card-subtitle">{dict.common.editExistingPaymentRecords}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPaymentTools(false)}>
                {dict.common.hide}
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
