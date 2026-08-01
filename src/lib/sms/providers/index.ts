import type { SmsProvider } from '../types';
import { MockSmsProvider } from './mock.provider';
import { BulkSmsBdProvider } from './bulksmsbd.provider';

export function getSmsProvider(providerName: string): SmsProvider {
  switch (providerName.toLowerCase()) {
    case 'bulksmsbd':
      return BulkSmsBdProvider;

    case 'mock':
      return MockSmsProvider;

    default:
      return MockSmsProvider;
  }
}