import type { SaleSmsTemplateInput } from './types';

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
    `প্রিয় ${input.partyName},`,
    `${getSaleLabel(input.saleType)}: ${formatInvoice(input.invoiceNumber)}`,
    `মোট বিল: ৳${input.totalAmount}`,
    `পরিশোধ: ৳${input.paidAmount}`,
    `বাকি: ৳${input.dueAmount}`,
    'ধন্যবাদ।'
  ];

  if (input.farmName?.trim()) {
    lines.push(input.farmName.trim());
  }

  return lines.join('\n');
}
