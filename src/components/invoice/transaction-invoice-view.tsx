import { Landmark } from 'lucide-react';
import type { InvoiceCompanyProfile } from '@/lib/branding';
import { InvoicePrintTrigger } from './invoice-print-trigger';

export type InvoiceLineItem = {
  id: string | number;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceParty = {
  label: string;
  name: string;
  phone?: string | null;
  address?: string | null;
};

export type TransactionInvoiceViewProps = {
  company: InvoiceCompanyProfile;
  title: string;
  invoiceNumber: string;
  transactionNumber: string;
  transactionType: string;
  transactionDate: Date;
  printDate: Date;
  party: InvoiceParty;
  items: InvoiceLineItem[];
  subtotal: number;
  discount?: number;
  paidAmount: number;
  dueAmount: number;
  previousDue?: number | null;
  totalDueAfter?: number | null;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
};

function formatCurrency(value: number | null | undefined) {
  return `Tk ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value ?? 0))}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value);
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value || '-'}</p>
    </div>
  );
}

export function TransactionInvoiceView({
  company,
  title,
  invoiceNumber,
  transactionNumber,
  transactionType,
  transactionDate,
  printDate,
  party,
  items,
  subtotal,
  discount = 0,
  paidAmount,
  dueAmount,
  previousDue,
  totalDueAfter,
  paymentMethod,
  referenceNumber,
  notes
}: TransactionInvoiceViewProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 print:bg-white print:p-0">
      <InvoicePrintTrigger />
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}</style>

      <section className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2">
              {company.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo} alt={company.name ?? 'Logo'} className="h-full w-full object-contain" />
              ) : (
                <Landmark className="h-8 w-8 text-slate-600" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">{company.name ?? 'Poultry Farm Management'}</h1>
              <p className="mt-1 text-sm text-slate-600">{company.address ?? '-'}</p>
              <p className="text-sm text-slate-600">Mobile: {company.phone ?? '-'}</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{title}</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">INVOICE</h2>
            <p className="mt-2 text-sm text-slate-600">Invoice: {invoiceNumber}</p>
          </div>
        </header>

        <section className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 print:bg-white">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Transaction No" value={transactionNumber} />
            <Detail label="Transaction Type" value={transactionType} />
            <Detail label="Transaction Date" value={formatDate(transactionDate)} />
            <Detail label="Print Date & Time" value={formatDateTime(printDate)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label={party.label} value={party.name} />
            <Detail label="Mobile" value={party.phone ?? '-'} />
            <div className="sm:col-span-2">
              <Detail label="Address" value={party.address ?? '-'} />
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Product Name</th>
                <th className="px-3 py-3 text-right font-semibold">Quantity</th>
                <th className="px-3 py-3 text-left font-semibold">Unit</th>
                <th className="px-3 py-3 text-right font-semibold">Unit Price</th>
                <th className="px-3 py-3 text-right font-semibold">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">{item.productName}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{item.quantity.toFixed(2)}</td>
                  <td className="px-3 py-3">{item.unit}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-5 grid gap-5 sm:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Payment Method" value={paymentMethod ?? '-'} />
              <Detail label="Reference Number" value={referenceNumber ?? '-'} />
              <div className="sm:col-span-2">
                <Detail label="Notes" value={notes ?? '-'} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {discount ? <div className="flex justify-between"><span>Discount</span><span>{formatCurrency(discount)}</span></div> : null}
              <div className="flex justify-between"><span>Paid Amount</span><span>{formatCurrency(paidAmount)}</span></div>
              <div className="flex justify-between"><span>Due Amount</span><span>{formatCurrency(dueAmount)}</span></div>
              <div className="flex justify-between"><span>Previous Due</span><span>{previousDue == null ? '-' : formatCurrency(previousDue)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                <span>Total Due After Transaction</span>
                <span>{totalDueAfter == null ? '-' : formatCurrency(totalDueAfter)}</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-12 grid grid-cols-2 gap-8 text-sm text-slate-700">
          <div>
            <div className="h-12 border-b border-slate-400" />
            <p className="mt-2 font-semibold">Receiver Signature</p>
          </div>
          <div>
            <div className="h-12 border-b border-slate-400" />
            <p className="mt-2 font-semibold">Customer/Supplier Signature</p>
          </div>
        </footer>
      </section>
    </main>
  );
}
