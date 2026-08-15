import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { getInvoiceCompanyProfile } from '@/lib/branding';
import { prisma } from '@/server/db';
import { TransactionInvoiceView } from '@/components/invoice/transaction-invoice-view';
import { InvoicePrintTrigger } from '@/components/invoice/invoice-print-trigger';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { getDictionary } from '@/i18n';

type InvoiceDisplaySettings = {
  hideFeedUnitPrice?: boolean;
  hideFeedLineTotal?: boolean;
};

function numberValue(value: unknown) {
  return Number((value as { toString?: () => string } | null | undefined)?.toString?.() ?? value ?? 0);
}

function parseInvoiceDisplaySettings(value: unknown): InvoiceDisplaySettings {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const source = value as Record<string, unknown>;
  return {
    hideFeedUnitPrice: Boolean(source.hideFeedUnitPrice),
    hideFeedLineTotal: Boolean(source.hideFeedLineTotal)
  };
}

export default async function TransactionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const transactionId = Number(id);
  if (!Number.isInteger(transactionId) || transactionId <= 0) notFound();

  const cookieStore = await cookies();
  const locale = getLocaleFromValue(cookieStore.get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);

  const [companyProfile, transaction, invoiceSettingsRecord] = await Promise.all([
    getInvoiceCompanyProfile(),
    prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        party: { select: { name: true, phone: true, address: true } },
        company: { select: { name: true, phone: true, address: true } },
        transactionItems: {
          include: { product: { select: { name: true, unit: true, productType: true } } },
          orderBy: { id: 'asc' }
        },
        payments: {
          include: { payment: true },
          orderBy: { id: 'asc' }
        },
        ledgerEntries: {
          orderBy: [{ entryDate: 'asc' }, { id: 'asc' }]
        }
      }
    }),
    (prisma as any).setting.findUnique({ where: { key: 'invoice_settings' } })
  ]);

  if (!transaction) notFound();

  const firstPayment = transaction.payments[0]?.payment;
  const counterparty = transaction.company ?? transaction.party;
  const displaySettings = parseInvoiceDisplaySettings(invoiceSettingsRecord?.value);

  return (
    <>
      <InvoicePrintTrigger />
      <TransactionInvoiceView
      company={companyProfile}
      invoiceNumber={transaction.invoiceNumber}
      transactionDate={transaction.transactionDate}
      party={{
        label: transaction.company ? 'Company' : transaction.transactionType === 'SALE' ? 'Customer' : 'Supplier',
        name: counterparty?.name ?? 'Unknown',
        phone: counterparty?.phone,
        address: counterparty?.address
      }}
      items={transaction.transactionItems.map((item) => ({
        id: item.id,
        productName: item.product?.name ?? item.description ?? 'Transaction item',
        quantity: numberValue(item.quantity),
        unit: item.product?.unit ?? '-',
        unitPrice: numberValue(item.unitPrice),
        lineTotal: numberValue(item.lineTotal),
        totalKg: numberValue(item.chickenQuantity),
        productType: item.product?.productType ?? null
      }))}
      showTotalKg={transaction.transactionType === 'PURCHASE'}
      subtotal={numberValue(transaction.subtotal)}
      totalAmount={numberValue(transaction.totalAmount)}
      discount={numberValue(transaction.discount)}
      paidAmount={numberValue(transaction.paidAmount)}
      dueAmount={numberValue(transaction.dueAmount)}
      paymentMethod={firstPayment?.paymentMethod ?? null}
      referenceNumber={transaction.referenceNumber ?? firstPayment?.referenceNumber ?? null}
      notes={transaction.notes}
      mediaName={transaction.mediaName}
      displaySettings={displaySettings}
      locale={locale}
      dict={dict.invoice}
    />
    </>
  );
}
