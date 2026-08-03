import type { ComboboxOption } from '@/components/ui/combobox';

export const STOCK_TYPE_OPTIONS: ComboboxOption[] = [
  { value: 'FEED', label: 'Feed' },
  { value: 'MEDICINE', label: 'Medicine' },
];

export const STOCK_PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'MOBILE_MONEY', label: 'Mobile money' },
  { value: 'OTHER', label: 'Other' },
] as const;
