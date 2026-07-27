import type { EmailProvider, EmailProviderName } from '../types';

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
  mock: MockEmailProvider
};

export function getEmailProvider(providerName: string): EmailProvider {
  const provider = providers[providerName.toLowerCase()];
  if (provider) return provider;
  return MockEmailProvider;
}