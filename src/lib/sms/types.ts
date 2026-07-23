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
