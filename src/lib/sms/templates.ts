import type { SaleSmsTemplateInput } from './types';

type PaymentSmsTemplateInput = {
  partyName: string;
  amount: string;
  remainingDue?: string;
  referenceNumber?: string | null;
};

function formatInvoice(invoiceNumber?: string | null) {
  return invoiceNumber?.trim() || 'N/A';
}

function getSaleLabel(saleType: SaleSmsTemplateInput['saleType']) {
  if (saleType === 'MEDICINE') {
    return 'Medicine Sale';
  }

  if (saleType === 'FEED') {
    return 'Feed Sale';
  }

  return 'Feed & Medicine Sale';
}

export function createSaleSmsMessage(input: SaleSmsTemplateInput) {
  const lines = [
    `Dear ${input.partyName},`,
    `${getSaleLabel(input.saleType)}: ${formatInvoice(input.invoiceNumber)}`,
    `Total bill: BDT ${input.totalAmount}`,
    `Paid: BDT ${input.paidAmount}`,
    `Due: BDT ${input.dueAmount}`,
    'Thank you.'
  ];

  if (input.farmName?.trim()) {
    lines.push(input.farmName.trim());
  }

  return lines.join('\n');
}

export function createPaymentReceivedSmsMessage(input: PaymentSmsTemplateInput) {
  const lines = [
    `Dear ${input.partyName},`,
    `Payment received: BDT ${input.amount}.`
  ];

  if (input.remainingDue !== undefined) {
    lines.push(`Remaining due: BDT ${input.remainingDue}.`);
  }

  if (input.referenceNumber?.trim()) {
    lines.push(`Reference: ${input.referenceNumber.trim()}.`);
  }

  lines.push('Thank you.');

  return lines.join('\n');
}

export function createPaymentPaidSmsMessage(input: PaymentSmsTemplateInput) {
  const lines = [
    `Dear ${input.partyName},`,
    `Payment paid: BDT ${input.amount}.`
  ];

  if (input.remainingDue !== undefined) {
    lines.push(`Remaining payable: BDT ${input.remainingDue}.`);
  }

  if (input.referenceNumber?.trim()) {
    lines.push(`Reference: ${input.referenceNumber.trim()}.`);
  }

  lines.push('Thank you.');

  return lines.join('\n');
}
