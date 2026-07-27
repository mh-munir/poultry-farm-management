export type EmailProviderName = 'mock' | string;

export interface EmailProvider {
  name: EmailProviderName;
  sendOtpEmail(contact: string, otpCode: string): Promise<{ status: 'SENT' | 'FAILED' | 'QUEUED'; errorMessage?: string | null }>;
}

export interface SendOtpInput {
  contact: string;
  code: string;
  channel: 'EMAIL' | 'SMS';
}

export interface SendOtpResult {
  channel: 'EMAIL' | 'SMS';
  status: 'SENT' | 'FAILED' | 'QUEUED';
  providerMessageId?: string | null;
  errorMessage?: string | null;
}