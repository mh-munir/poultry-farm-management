import type { EmailProvider, EmailProviderName } from '../types';
import { ResendEmailProvider } from './resend.provider';

export const MockEmailProvider: EmailProvider = {
  name: 'mock',
  async sendOtpEmail(_contact, _otpCode) {
    if (process.env.NODE_ENV === 'production') {
      return { status: 'QUEUED' };
    }
    return { status: 'SENT' };
  }
};

const providers: Record<string, EmailProvider> = {
  mock: MockEmailProvider,
  resend: ResendEmailProvider
};

export function getEmailProvider(providerName: string): EmailProvider {
  const normalizedProviderName = providerName?.toLowerCase();
  const provider = providers[normalizedProviderName ?? ''];
  if (provider) return provider;

  if (process.env.NODE_ENV === 'production') {
    return {
      name: normalizedProviderName ?? 'unknown',
      async sendOtpEmail(_contact, _otpCode) {
        return { status: 'FAILED', errorMessage: `Unsupported email provider in production: ${providerName}` };
      }
    };
  }

  return MockEmailProvider;
}