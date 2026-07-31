import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getInvoiceCompanyProfile } from '@/lib/branding';
import { prisma } from '@/server/db';
import { TransactionInvoiceView } from '@/components/invoice/transaction-invoice-view';

function numberValue(value: unknown) {
  return Number((value as { toString?: () => string } | null | undefined)?.toString?.() ?? value ?? 0);
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function TransactionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const transactionId = Number(id);
  if (!Number.isInteger(transactionId) || transactionId <= 0) notFound();

  const [companyProfile, transaction] = await Promise.all([
    getInvoiceCompanyProfile(),
    prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        party: { select: { name: true, phone: true, address: true } },
        company: { select: { name: true, phone: true, address: true } },
        transactionItems: {
          include: { product: { select: { name: true, unit: true } } },
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
    })
  ]);

  if (!transaction) notFound();

  const mainLedger = transaction.ledgerEntries.find((entry) => entry.entryType === transaction.transactionType);
  const lastLedger = transaction.ledgerEntries.at(-1);
  const previousDue = mainLedger
    ? numberValue(mainLedger.runningBalance) - numberValue(mainLedger.amount)
    : null;
  const totalDueAfter = lastLedger ? numberValue(lastLedger.runningBalance) : numberValue(transaction.dueAmount);
  const firstPayment = transaction.payments[0]?.payment;
  const counterparty = transaction.company ?? transaction.party;

  return (
    <TransactionInvoiceView
      company={companyProfile}
      title={`${titleCase(transaction.transactionType)} Transaction`}
      invoiceNumber={transaction.invoiceNumber}
      transactionNumber={String(transaction.id).padStart(6, '0')}
      transactionType={titleCase(transaction.transactionType)}
      transactionDate={transaction.transactionDate}
      printDate={new Date()}
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
        lineTotal: numberValue(item.lineTotal)
      }))}
      subtotal={numberValue(transaction.subtotal)}
      discount={numberValue(transaction.discount)}
      paidAmount={numberValue(transaction.paidAmount)}
      dueAmount={numberValue(transaction.dueAmount)}
      previousDue={previousDue}
      totalDueAfter={totalDueAfter}
      paymentMethod={firstPayment?.paymentMethod ?? null}
      referenceNumber={transaction.referenceNumber ?? firstPayment?.referenceNumber ?? null}
      notes={transaction.notes}
    />
  );
}
