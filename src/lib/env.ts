import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(1).optional(),
  ADMIN_RESET_TOKEN: z.string().min(1).optional(),
  SMS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) =>
      value === 'true' ? true : value === 'false' ? false : undefined
    ),
  ENABLE_SMS: z
    .enum(['true', 'false'])
    .optional(),
  SMS_PROVIDER: z.string().trim().min(1).default('mock'),
  BULKSMSBD_API_KEY: z.string().optional(),
  BULKSMSBD_SENDER_ID: z.string().optional(),
  BULKSMSBD_API_URL: z.string().optional(),
  EMAIL_PROVIDER: z.string().trim().min(1).default('mock')
}).transform((env) => ({
  ...env,
  DIRECT_URL: env.DIRECT_URL ?? env.DATABASE_URL,
  AUTH_URL: env.AUTH_URL ?? env.NEXTAUTH_URL ?? env.NEXT_PUBLIC_APP_URL,
  SMS_ENABLED:
    env.SMS_ENABLED ??
    (env.ENABLE_SMS ? env.ENABLE_SMS.toLowerCase() === 'true' : undefined) ??
    (env.SMS_PROVIDER.toLowerCase() !== 'mock' &&
      Boolean(env.BULKSMSBD_API_KEY) &&
      Boolean(env.BULKSMSBD_SENDER_ID) &&
      Boolean(env.BULKSMSBD_API_URL))
}));

function getEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join(', ');

  return {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    DIRECT_URL: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
    AUTH_SECRET: process.env.AUTH_SECRET ?? 'change-me-in-production',
    AUTH_URL: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_RESET_TOKEN: process.env.ADMIN_RESET_TOKEN,
    SMS_ENABLED:
      process.env.SMS_ENABLED === 'true' ||
      ((process.env.SMS_PROVIDER ?? 'mock').toLowerCase() !== 'mock' &&
        Boolean(process.env.BULKSMSBD_API_KEY) &&
        Boolean(process.env.BULKSMSBD_SENDER_ID) &&
        Boolean(process.env.BULKSMSBD_API_URL)),
    SMS_PROVIDER: process.env.SMS_PROVIDER ?? 'mock',
    BULKSMSBD_API_KEY: process.env.BULKSMSBD_API_KEY,
    BULKSMSBD_SENDER_ID: process.env.BULKSMSBD_SENDER_ID,
    BULKSMSBD_API_URL: process.env.BULKSMSBD_API_URL,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? 'mock'
  } as z.infer<typeof envSchema>;
}

export const env = getEnv();

export function isSmsProviderConfigured() {
  const providerName = env.SMS_PROVIDER?.trim().toLowerCase() ?? 'mock';
  if (providerName !== 'bulksmsbd') {
    return false;
  }

  return Boolean(
    env.BULKSMSBD_API_KEY?.trim() &&
    env.BULKSMSBD_SENDER_ID?.trim() &&
    env.BULKSMSBD_API_URL?.trim()
  );
}

export function getSmsProviderStatusMessage() {
  if (env.SMS_PROVIDER?.trim().toLowerCase() === 'mock') {
    return 'SMS is currently disabled because the SMS provider is configured as mock.';
  }

  if (!isSmsProviderConfigured()) {
    return 'SMS provider is not fully configured. Add BulkSMSBD credentials and endpoint to enable SMS notifications.';
  }

  if (!env.SMS_ENABLED) {
    return 'SMS is disabled in environment configuration.';
  }

  return 'SMS provider is configured and enabled.';
}
