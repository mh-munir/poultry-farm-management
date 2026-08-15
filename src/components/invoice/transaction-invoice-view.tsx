import type { InvoiceCompanyProfile } from '@/lib/branding';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { formatDateBD as formatDate, formatDateTimeBD as formatDateTime } from '@/lib/dates';
import { formatLocalizedCurrency } from '@/lib/localized-formatters';

export type InvoiceDisplaySettings = {
  hideFeedUnitPrice?: boolean;
  hideFeedLineTotal?: boolean;
};

export type InvoiceLineItem = {
  id: string | number;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  totalKg?: number | null;
  productType?: string | null;
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
  mediaName?: string | null;
  showTotalKg?: boolean;
  displaySettings?: InvoiceDisplaySettings;
  locale?: 'en' | 'bn';
  dict?: any;
};

function formatCurrency(value: number | null | undefined) {
  return `Tk ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value ?? 0))}`;
}

// using centralized Bangladesh-aware formatters

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value || '-'}</p>
    </div>
  );
}

function isFeedProduct(productType?: string | null) {
  return typeof productType === 'string' && productType.trim().toUpperCase() === 'FEED';
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
  notes,
  mediaName,
  showTotalKg = false,
  displaySettings = {},
  locale = 'en',
  dict = {}
}: TransactionInvoiceViewProps) {
  const brandName = company?.name?.trim() || 'Your Brand Name';
  const brandAddress = company?.address?.trim() || '';
  const brandPhone = company?.phone?.trim() || '';
  const brandWebsite = company?.website?.trim() || '';
  const brandShortName = brandName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || 'BR';

  // Default English dictionary for offline use
  const defaultDict = {
    invoice: {
      invoice: locale === 'bn' ? 'ইনভয়েস' : 'INVOICE',
      invoiceTo: locale === 'bn' ? 'কে ইনভয়েস:' : 'Invoice to:',
      invoiceNumber: locale === 'bn' ? 'ইনভয়েস #' : 'Invoice #',
      date: locale === 'bn' ? 'তারিখ' : 'Date',
      media: locale === 'bn' ? 'মিডিয়া' : 'Media',
      sl: locale === 'bn' ? 'ক্রমিক.' : 'SL.',
      itemDescription: locale === 'bn' ? 'আইটেমের বিবরণ' : 'Item Description',
      price: locale === 'bn' ? 'দাম' : 'Price',
      qty: locale === 'bn' ? 'পরিমাণ' : 'Qty',
      totalLabel: locale === 'bn' ? 'মোট' : 'Total',
      totalKg: locale === 'bn' ? 'মোট কেজি' : 'Total Kg',
      thankYou: locale === 'bn' ? 'আপনার ব্যবসার জন্য ধন্যবাদ' : 'Thank you for your business',
      subTotal: locale === 'bn' ? 'উপ মোট:' : 'Sub Total:',
      tax: locale === 'bn' ? 'কর:' : 'Tax:',
      total: locale === 'bn' ? 'মোট:' : 'Total:',
      termsAndConditions: locale === 'bn' ? 'শর্তাবলী' : 'Terms & Conditions',
      paymentInfo: locale === 'bn' ? 'পেমেন্ট তথ্য' : 'Payment Info',
      authorizedSign: locale === 'bn' ? 'অনুমোদিত স্বাক্ষর' : 'Authorized Sign',
      paymentDueNote: locale === 'bn' ? '১৫ দিনে পেমেন্ট দিতে হবে। দেরি হলে ফি ধার্য হতে পারে।' : 'Payment due within 15 days. Late payments may be subject to fees.',
      accountNumber: locale === 'bn' ? 'অ্যাকাউন্ট #: ১২৩৪ ৫৬৭৮ ৯০১२' : 'Account #: 1234 5678 9012',
      bank: locale === 'bn' ? 'ব্যাংক: উদাহরণ ব্যাংক' : 'Bank: Example Bank',
      hidden: locale === 'bn' ? 'লুকানো' : 'Hidden'
    }
  };

  const safeDict = { ...defaultDict, ...(dict || {}) };

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
        <header className="invoice-brand-header bg-white p-4 sm:p-6 border-b border-slate-100">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center justify-between gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center overflow-hidden rounded border bg-white">
                {company.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logo} alt={brandName} className="h-full w-full object-contain" />
                ) : (
                  <div className="h-8 w-8 bg-slate-100 rounded flex items-center justify-center text-slate-500 font-semibold leading-5">{brandShortName}</div>
                )}
              </div>
              <div>
                <div className="text-lg text-slate-800 font-bold leading-6 mb-1 w-52">{brandName}</div>
                {brandAddress ? <div className="text-xs text-slate-400 w-60">{brandAddress}</div> : null}
              </div>
            </div>

            <div className="flex">
              <div className="">
                <div className="h-5 bg-yellow-400 w-full rounded" />
              </div>

              <div className="text-left sm:text-right">
                <div className="text-4xl md:text-5xl font-extrabold tracking-wider text-slate-950">{safeDict.invoice.invoice}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="h-3 bg-yellow-400 rounded-t" />

        <main className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 mb-6 px-4">
            <div>
              <div className="text-xs text-slate-500">{safeDict.invoice.invoiceTo}</div>
              <div className="font-medium text-slate-900 text-lg">{party.name}</div>
              <div className="mt-1 text-sm text-slate-600">{party.address ?? ''}</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">{safeDict.invoice.invoiceNumber}</div>
              <div className="font-medium text-slate-900">{invoiceNumber}</div>
              <div className="mt-2 text-xs text-slate-500">{safeDict.invoice.date}</div>
              <div className="font-medium text-slate-900">{formatDate(transactionDate)}</div>
              {mediaName ? (
                <div className="mt-2 text-xs text-slate-500">{safeDict.invoice.media}</div>
              ) : null}
              {mediaName ? (
                <div className="font-medium text-slate-900">{mediaName}</div>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden border-t border-b">
            <ResponsiveTable minWidth="700px">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">{safeDict.invoice.sl}</th>
                    <th className="px-4 py-3 text-left">{safeDict.invoice.itemDescription}</th>
                    <th className="px-4 py-3 text-right">{safeDict.invoice.price}</th>
                    <th className="px-4 py-3 text-center">{safeDict.invoice.qty}</th>
                    {showTotalKg ? <th className="px-4 py-3 text-right">{safeDict.invoice.totalKg}</th> : null}
                    <th className="px-4 py-3 text-right">{safeDict.invoice.totalLabel}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {items.map((it, idx) => {
                    const isFeed = isFeedProduct(it.productType);
                    const hideUnitPrice = Boolean(isFeed && displaySettings.hideFeedUnitPrice);
                    const hideLineTotal = Boolean(isFeed && displaySettings.hideFeedLineTotal);

                    return (
                      <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 text-slate-700">{idx + 1}</td>
                        <td className="px-4 py-3 text-slate-700">{it.productName}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{hideUnitPrice ? safeDict.invoice.hidden : formatLocalizedCurrency(it.unitPrice, locale)}</td>
                        <td className="px-4 py-3 text-center text-slate-700">
                          {showTotalKg && it.unit.toLowerCase() === 'kg'
                            ? it.quantity.toFixed(2)
                            : `${it.quantity.toFixed(2)} ${it.unit}`}
                        </td>
                        {showTotalKg ? (
                          <td className="px-4 py-3 text-right text-slate-700">
                            {typeof it.totalKg === 'number' && it.totalKg > 0 ? `${it.totalKg.toFixed(2)} kg` : '—'}
                          </td>
                        ) : null}
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{hideLineTotal ? safeDict.invoice.hidden : formatLocalizedCurrency(it.lineTotal, locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResponsiveTable>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_320px] gap-4 px-4">
            <div>
              <div className="text-sm text-slate-600">{safeDict.invoice.thankYou}</div>
            </div>
            <div className="flex justify-end">
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-sm text-slate-600"><div>{safeDict.invoice.subTotal}</div><div>{formatLocalizedCurrency(subtotal, locale)}</div></div>
                <div className="flex justify-between text-sm text-slate-600 mt-1"><div>{safeDict.invoice.tax}</div><div>{formatLocalizedCurrency(0, locale)}</div></div>
                <div className="mt-3">
                  <div className="flex items-center justify-between bg-yellow-400 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">{safeDict.invoice.total}</div>
                    <div className="text-xl font-extrabold text-slate-900">{formatLocalizedCurrency(totalDueAfter ?? subtotal, locale)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 text-sm text-slate-600 sm:grid-cols-2 px-4">
            <div>
              <div className="font-semibold text-slate-800 mb-2">{safeDict.invoice.termsAndConditions}</div>
              <div>{safeDict.invoice.paymentDueNote}</div>
            </div>
            <div>
              <div className="font-semibold text-slate-800 mb-2">{safeDict.invoice.paymentInfo}</div>
              <div>{safeDict.invoice.accountNumber}</div>
              <div>{safeDict.invoice.bank}</div>
            </div>
          </div>
        </main>

        <footer className="p-4 sm:p-6 bg-white border-t text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>Phone: {company.phone ?? '—'} | Address: {company.address ?? '—'} | {company.website ?? ''}</div>
          <div className="text-left sm:text-right">
            <div className="font-semibold text-slate-800">{safeDict.invoice.authorizedSign}</div>
            <div className="mt-4 h-8 w-40 sm:w-48 border-b border-slate-300" />
          </div>
        </footer>
      </div>
    </div>
  );
}
