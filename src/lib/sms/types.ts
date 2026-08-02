import type { SmsNotificationStatus } from '@prisma/client';

export type SmsSaleType = 'FEED' | 'MEDICINE' | 'MIXED';

export type SmsProviderName = 'mock' | string;

export type SmsProviderResult = {
  status: Extract<SmsNotificationStatus, 'QUEUED' | 'SENT' | 'FAILED'>;
  providerMessageId?: string;
  errorMessage?: string;
};

export type SmsProvider = {
  name: SmsProviderName;
  sendSms(phoneNumber: string, message: string): Promise<SmsProviderResult>;
};

export type SaleSmsTemplateInput = {
  saleType: SmsSaleType;
  partyName: string;
  invoiceNumber?: string | null;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  farmName?: string | null;
};

export type TransactionSmsType = 'SALE' | 'PURCHASE' | 'PAYMENT_RECEIVED' | 'PAYMENT_PAID';

export type QueueTransactionSmsInput = {
  partyId?: number | null;
  companyId?: number | null;
  transactionId?: number | null;
  phoneNumber?: string | null;
  partyName: string;
  message: string;
  saleType?: SmsSaleType;
  transactionType?: TransactionSmsType;
};

export type QueueSaleSmsInput = SaleSmsTemplateInput & {
  partyId: number;
  transactionId: number;
  phoneNumber?: string | null;
};

export type QueueSaleSmsResult = {
  status: SmsNotificationStatus;
  message: string;
  notificationId?: number;
  errorMessage?: string | null;
};
