'use client';

import type { InvoiceCompanyProfile } from '@/lib/branding';
import { convertToBanglaDigits, formatLocalizedCurrency, formatLocalizedDate } from '@/lib/localized-formatters';
import { useLocale } from '@/i18n/provider';
import { localizeProductText } from '@/i18n/display';

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
  invoiceNumber: string;
  transactionDate: Date;
  party: InvoiceParty;
  items: InvoiceLineItem[];
  subtotal: number;
  totalAmount: number;
  discount?: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  mediaName?: string | null;
  showTotalKg?: boolean;
  displaySettings?: InvoiceDisplaySettings;
  locale?: 'en' | 'bn';
  dict?: Record<string, string>;
};

const english = {
  invoice: 'INVOICE', invoiceTo: 'Invoice to:', invoiceNumber: 'Invoice #', date: 'Date', media: 'Media', reference: 'Reference', address: 'Address', phone: 'Mobile:', notSet: 'Not set',
  itemDescription: 'Product Name', price: 'Unit Price', qty: 'Quantity', totalLabel: 'Total Amount', totalKg: 'Total KG',
  thankYou: 'Thank you for your business', subTotal: 'Sub Total:', discount: 'Discount:', paid: 'Paid:', due: 'Due:',
  total: 'Total:', notes: 'Notes', authorizedSign: 'Authorized Sign', hidden: 'Hidden'
};

const banglaFallback = {
  invoice: 'ইনভয়েস', invoiceTo: 'ইনভয়েস প্রাপক:', invoiceNumber: 'ইনভয়েস নং', date: 'তারিখ', media: 'মিডিয়া', reference: 'রেফারেন্স', address: 'ঠিকানা', phone: 'মোবাইল:', notSet: 'সেট করা হয়নি',
  itemDescription: 'পণ্যের নাম', price: 'একক মূল্য', qty: 'পরিমাণ', totalLabel: 'মোট মূল্য', totalKg: 'মোট কেজি',
  thankYou: 'আপনার ব্যবসার জন্য ধন্যবাদ', subTotal: 'উপমোট:', discount: 'ছাড়:', paid: 'পরিশোধ:', due: 'বকেয়া:',
  total: 'মোট:', notes: 'নোট', authorizedSign: 'অনুমোদিত স্বাক্ষর', hidden: 'লুকানো'
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'নগদ',
  BANK_TRANSFER: 'ব্যাংক ট্রান্সফার',
  CHEQUE: 'চেক',
  MOBILE_MONEY: 'মোবাইল ব্যাংকিং',
  OTHER: 'অন্যান্য'
};

function isFeedProduct(productType?: string | null) {
  return productType?.trim().toUpperCase() === 'FEED';
}

export function TransactionInvoiceView({
  company, invoiceNumber, transactionDate, party, items, subtotal, totalAmount, discount = 0, paidAmount, dueAmount,
  paymentMethod, referenceNumber, notes, mediaName, showTotalKg = false, displaySettings = {}, locale = 'en', dict = {}
}: TransactionInvoiceViewProps) {
  const { locale: liveLocale, dict: liveDict } = useLocale();
  const currentLocale = liveLocale ?? locale;
  const copy = { ...english, ...(currentLocale === 'bn' ? banglaFallback : {}), ...dict, ...liveDict.invoice };
  const localizedPaymentMethod = paymentMethod && currentLocale === 'bn'
    ? paymentMethodLabels[paymentMethod] ?? paymentMethod
    : paymentMethod;
  const formatDecimal = (value: number) => currentLocale === 'bn' ? convertToBanglaDigits(value.toFixed(2)) : value.toFixed(2);
  const brandName = company.name?.trim() || 'Your Brand Name';
  const companyAddress = company.address?.trim() || copy.notSet;
  const companyPhone = company.phone?.trim() || copy.notSet;
  const brandInitials = brandName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'BR';
  const hasDiscount = discount > 0;
  const hasPayment = paidAmount > 0 || dueAmount > 0;

  return (
    <article className="invoice-print-area mx-auto w-full max-w-[190mm] bg-white text-slate-800">
      <div className="overflow-hidden border border-slate-200">
        <header className="invoice-brand-header flex items-center justify-between gap-5 px-7 pt-6 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-300 text-sm font-bold text-slate-700">
              {company.logo ? <img src={company.logo} alt={brandName} className="h-full w-full object-contain" /> : brandInitials}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight text-slate-900">{brandName}</h1>
              <p className="mt-1 text-[10px] leading-tight text-slate-500">{copy.address}: {companyAddress}</p>
              <p className="text-[10px] leading-tight text-slate-500">{copy.phone} {companyPhone}</p>
            </div>
          </div>
          <h2 className="text-3xl font-light tracking-wide text-slate-900 sm:text-4xl">{copy.invoice}</h2>
        </header>
        <div className="h-2.5 bg-amber-400" />

        <div className="px-7 py-5">
          <section className="grid grid-cols-2 gap-8 pb-6 text-xs">
            <div>
              <p className="font-semibold text-slate-600">{copy.invoiceTo}</p>
              <p className="mt-1 font-bold text-slate-900">{party.name}</p>
              {party.address ? <p className="mt-1 whitespace-pre-line text-slate-600">{party.address}</p> : null}
              {party.phone ? <p className="text-slate-600">{party.phone}</p> : null}
            </div>
            <dl className="grid grid-cols-[auto_1fr] justify-self-end gap-x-5 gap-y-1 text-right">
              <dt className="font-semibold text-slate-600">{copy.invoiceNumber}</dt><dd>{invoiceNumber}</dd>
              <dt className="font-semibold text-slate-600">{copy.date}</dt><dd>{formatLocalizedDate(transactionDate, currentLocale)}</dd>
              {mediaName ? <><dt className="font-semibold text-slate-600">{copy.media}</dt><dd>{mediaName}</dd></> : null}
              {referenceNumber ? <><dt className="font-semibold text-slate-600">{copy.reference}</dt><dd>{referenceNumber}</dd></> : null}
            </dl>
          </section>

          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-800 text-left text-white">
              <tr>
                <th className="px-2 py-2 font-semibold">{copy.itemDescription}</th><th className="px-2 py-2 text-center font-semibold">{copy.qty}</th>
                <th className="px-2 py-2 text-right font-semibold">{copy.price}</th>
                {showTotalKg ? <th className="px-2 py-2 text-right font-semibold">{copy.totalKg}</th> : null}<th className="px-2 py-2 text-right font-semibold">{copy.totalLabel}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const hidePrice = isFeedProduct(item.productType) && displaySettings.hideFeedUnitPrice;
                const hideTotal = isFeedProduct(item.productType) && displaySettings.hideFeedLineTotal;
                return <tr key={item.id} className={index % 2 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="px-2 py-2.5">{localizeProductText(item.productName, currentLocale)}</td>
                  <td className="px-2 py-2.5 text-center">{formatDecimal(item.quantity)} {localizeProductText(item.unit, currentLocale)}</td>
                  <td className="px-2 py-2.5 text-right">{hidePrice ? copy.hidden : formatLocalizedCurrency(item.unitPrice, currentLocale)}</td>
                  {showTotalKg ? <td className="px-2 py-2.5 text-right">{typeof item.totalKg === 'number' ? `${formatDecimal(item.totalKg)} ${currentLocale === 'bn' ? 'কেজি' : 'kg'}` : '—'}</td> : null}
                  <td className="px-2 py-2.5 text-right font-semibold">{hideTotal ? copy.hidden : formatLocalizedCurrency(item.lineTotal, currentLocale)}</td>
                </tr>;
              })}
            </tbody>
          </table>

          <section className="mt-5 grid grid-cols-[1fr_190px] gap-8 text-xs">
            <div className="text-slate-600"><p className="font-semibold">{copy.thankYou}</p>{notes ? <div className="mt-5"><p className="font-semibold text-slate-700">{copy.notes}</p><p className="mt-1 whitespace-pre-line">{notes}</p></div> : null}</div>
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt>{copy.subTotal}</dt><dd>{formatLocalizedCurrency(subtotal, currentLocale)}</dd></div>
              {hasDiscount ? <div className="flex justify-between"><dt>{copy.discount}</dt><dd>-{formatLocalizedCurrency(discount, currentLocale)}</dd></div> : null}
              {hasPayment ? <><div className="flex justify-between"><dt>{copy.paid}</dt><dd>{formatLocalizedCurrency(paidAmount, currentLocale)}</dd></div><div className="flex justify-between"><dt>{copy.due}</dt><dd>{formatLocalizedCurrency(dueAmount, currentLocale)}</dd></div></> : null}
              <div className="mt-3 flex justify-between bg-amber-400 px-3 py-2.5 text-sm font-bold"><dt>{copy.total}</dt><dd>{formatLocalizedCurrency(totalAmount, currentLocale)}</dd></div>
              {localizedPaymentMethod ? <p className="pt-1 text-right text-[10px] text-slate-500">{localizedPaymentMethod}</p> : null}
            </dl>
          </section>
        </div>
        <footer className="flex items-end justify-between border-t-2 border-amber-400 px-7 py-4 text-[10px] text-slate-600">
          <p>{[`${copy.phone} ${companyPhone}`, `${copy.address}: ${companyAddress}`, company.website].filter(Boolean).join('  |  ')}</p>
          <div className="w-28 text-center"><div className="h-7 border-b border-slate-400" /><p className="mt-1 font-semibold">{copy.authorizedSign}</p></div>
        </footer>
      </div>
    </article>
  );
}
