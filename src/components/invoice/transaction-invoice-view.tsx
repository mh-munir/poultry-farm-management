import type { InvoiceCompanyProfile } from '@/lib/branding';
import { ResponsiveTable } from '@/components/ui/responsive-table';

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
    <div className="invoice-print-area max-w-4xl mx-auto bg-white print:bg-white">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}</style>

      <div className="shadow-sm border rounded-md overflow-visible">
        <header className="bg-white p-4 sm:p-6 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center overflow-hidden rounded border bg-white">
                {company.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logo} alt={company.name ?? 'Company'} className="h-full w-full object-contain" />
                ) : (
                  <div className="h-8 w-8 bg-slate-100 rounded flex items-center justify-center text-slate-500 font-semibold">LOGO</div>
                )}
              </div>
              <div>
                <div className="text-sm text-slate-600 font-semibold">{company.name ?? 'Company'}</div>
                <div className="text-xs text-slate-400">{company.address ?? ''}</div>
              </div>
            </div>

            <div className="flex-1 mx-6 hidden md:block">
              <div className="h-5 bg-yellow-400 w-full rounded" />
            </div>

            <div className="text-right">
              <div className="text-4xl md:text-5xl font-extrabold tracking-wider text-slate-950">INVOICE</div>
            </div>
          </div>
        </header>

        <div className="h-3 bg-yellow-400" />

        <main className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div>
              <div className="text-xs text-slate-500">Invoice to:</div>
              <div className="font-medium text-slate-900 text-lg">{party.name}</div>
              <div className="mt-1 text-sm text-slate-600">{party.address ?? ''}</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Invoice #</div>
              <div className="font-medium text-slate-900">{invoiceNumber}</div>
              <div className="mt-2 text-xs text-slate-500">Date</div>
              <div className="font-medium text-slate-900">{formatDate(transactionDate)}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border">
            <ResponsiveTable minWidth="700px">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">SL.</th>
                    <th className="px-4 py-3 text-left">Item Description</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {items.map((it, idx) => (
                    <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 text-slate-700">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-700">{it.productName}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(it.unitPrice)}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{it.quantity.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_320px] gap-4">
            <div>
              <div className="text-sm text-slate-600">Thank you for your business</div>
            </div>
            <div className="flex justify-end">
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-sm text-slate-600"><div>Sub Total:</div><div>{formatCurrency(subtotal)}</div></div>
                <div className="flex justify-between text-sm text-slate-600 mt-1"><div>Tax:</div><div>{formatCurrency(0)}</div></div>
                <div className="mt-3">
                  <div className="flex items-center justify-between bg-yellow-400 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">Total:</div>
                    <div className="text-xl font-extrabold text-slate-900">{formatCurrency(totalDueAfter ?? subtotal)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <div className="font-semibold text-slate-800 mb-2">Terms & Conditions</div>
              <div>Payment due within 15 days. Late payments may be subject to fees.</div>
            </div>
            <div>
              <div className="font-semibold text-slate-800 mb-2">Payment Info</div>
              <div>Account #: 1234 5678 9012</div>
              <div>Bank: Example Bank</div>
            </div>
          </div>
        </main>

        <footer className="p-4 sm:p-6 bg-white border-t text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>Phone: {company.phone ?? '—'} | Address: {company.address ?? '—'} | {company.website ?? ''}</div>
          <div className="text-left sm:text-right">
            <div className="font-semibold text-slate-800">Authorized Sign</div>
            <div className="mt-4 h-8 w-40 sm:w-48 border-b border-slate-300" />
          </div>
        </footer>
      </div>
    </div>
  );
}
