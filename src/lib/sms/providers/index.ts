import type { SmsProvider } from '../types';
import { MockSmsProvider } from './mock.provider';

export function getSmsProvider(providerName: string): SmsProvider {
  switch (providerName.toLowerCase()) {
    case 'mock':
      return MockSmsProvider;
    default:
      return MockSmsProvider;
  }
}
