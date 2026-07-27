import { getEmailProvider } from './email/providers';
import { getSmsProvider } from './sms/providers';
import { env } from '@/lib/env';

export type NotificationChannel = 'EMAIL' | 'SMS';

export interface SendOtpInput {
  contact: string;
  code: string;
  channel: NotificationChannel;
}

export async function sendOtp({ contact, code, channel }: SendOtpInput) {
  if (channel === 'SMS') {
    const providerName = env.SMS_PROVIDER || 'mock';
    const provider = getSmsProvider(providerName);
    const result = await provider.sendSms(contact, `Your verification code is ${code}. It will expire in 5 minutes.`);
    return { channel, status: result.status, providerMessageId: result.providerMessageId };
  }

  const providerName = env.EMAIL_PROVIDER || 'mock';
  const provider = getEmailProvider(providerName);
  const result = await provider.sendOtpEmail(contact, code);
  return { channel, status: result.status, errorMessage: result.errorMessage };
}