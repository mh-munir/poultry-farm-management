import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordResetPayload } from '../../src/lib/password-reset';

test('rejects invalid email addresses and mismatched passwords', () => {
  const result = validatePasswordResetPayload({
    email: 'not-an-email',
    otpCode: '123456',
    password: 'newpassword',
    confirmPassword: 'different-password'
  });

  assert.equal(result.success, false);
  assert.ok(result.error);
  assert.match(result.error, /valid email/i);
});

test('accepts complete password reset payloads', () => {
  const result = validatePasswordResetPayload({
    email: 'admin@example.com',
    otpCode: '123456',
    password: 'newpassword123',
    confirmPassword: 'newpassword123'
  });

  assert.equal(result.success, true);
  assert.equal(result.error, undefined);
});
