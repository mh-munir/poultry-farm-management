import assert from 'node:assert/strict';
import test from 'node:test';

import { getEmailProvider } from '../src/lib/email/providers/mock.provider';
import { createResendEmailProvider } from '../src/lib/email/providers/resend.provider';
import { sendOtp } from '../src/lib/notifications';

delete process.env.RESEND_API_KEY;
delete process.env.RESEND_FROM_EMAIL;

test('mock provider is used for EMAIL_PROVIDER=mock', async () => {
  process.env.EMAIL_PROVIDER = 'mock';
  const provider = getEmailProvider('mock');
  assert.equal(provider.name, 'mock');
  const result = await provider.sendOtpEmail('recipient@example.com', '123456');
  assert.equal(result.status, 'SENT');
});

test('resend provider resolves when EMAIL_PROVIDER=resend', async () => {
  process.env.EMAIL_PROVIDER = 'resend';
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.RESEND_FROM_EMAIL = 'no-reply@example.com';

  const provider = getEmailProvider('resend');
  assert.equal(provider.name, 'resend');

  const testProvider = createResendEmailProvider(() => ({
    emails: {
      send: async () => ({ data: { id: 'msg_123' }, error: null })
    }
  }));

  const result = await testProvider.sendOtpEmail('recipient@example.com', '123456');
  assert.equal(result.status, 'SENT');
});

test('missing RESEND_API_KEY fails clearly', async () => {
  delete process.env.RESEND_API_KEY;
  process.env.RESEND_FROM_EMAIL = 'no-reply@example.com';

  const provider = getEmailProvider('resend');
  const result = await provider.sendOtpEmail('recipient@example.com', '123456');

  assert.equal(result.status, 'FAILED');
  assert.match(result.errorMessage ?? '', /RESEND_API_KEY/i);
});

test('missing RESEND_FROM_EMAIL fails clearly', async () => {
  process.env.RESEND_API_KEY = 'test-api-key';
  delete process.env.RESEND_FROM_EMAIL;

  const provider = getEmailProvider('resend');
  const result = await provider.sendOtpEmail('recipient@example.com', '123456');

  assert.equal(result.status, 'FAILED');
  assert.match(result.errorMessage ?? '', /RESEND_FROM_EMAIL/i);
});

test('resend API failure is handled', async () => {
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.RESEND_FROM_EMAIL = 'no-reply@example.com';

  const provider = getEmailProvider('resend');

  const testProvider = createResendEmailProvider(() => ({
    emails: {
      send: async () => ({ data: null, error: { message: 'invalid recipient' } })
    }
  }));

  const result = await testProvider.sendOtpEmail('recipient@example.com', '123456');
  assert.equal(result.status, 'FAILED');
  assert.match(result.errorMessage ?? '', /recipient/i);
});

test('unknown provider does not silently fall back to mock in production', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
  const provider = getEmailProvider('unknown-provider');
  const result = await provider.sendOtpEmail('recipient@example.com', '123456');
  assert.equal(result.status, 'FAILED');
  assert.match(result.errorMessage ?? '', /unsupported email provider/i);
  if (originalNodeEnv === undefined) {
    delete (process.env as Record<string, string | undefined>)['NODE_ENV'];
  } else {
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = originalNodeEnv;
  }
});

test('shared notification abstraction does not log OTP or API key', async () => {
  process.env.EMAIL_PROVIDER = 'mock';
  const originalInfo = console.info;
  const originalError = console.error;
  const logs: string[] = [];
  console.info = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };
  console.error = (...args: unknown[]) => {
    logs.push(args.join(' '));
  };

  try {
    const result = await sendOtp({ contact: 'recipient@example.com', code: '123456', channel: 'EMAIL' });
    assert.equal(result.status, 'SENT');
    assert.equal(logs.some((entry) => entry.includes('123456')), false);
    assert.equal(logs.some((entry) => entry.includes('test-api-key')), false);
  } finally {
    console.info = originalInfo;
    console.error = originalError;
  }
});
