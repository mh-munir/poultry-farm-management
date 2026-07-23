import type { SmsProvider } from '../types';

export const MockSmsProvider: SmsProvider = {
  name: 'mock',
  async sendSms() {
    return {
      status: 'QUEUED',
      providerMessageId: `mock-${Date.now()}`
    };
  }
};
