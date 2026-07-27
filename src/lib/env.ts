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
    .default('false')
    .transform((value) => value === 'true'),
  SMS_PROVIDER: z.string().trim().min(1).default('mock'),
  EMAIL_PROVIDER: z.string().trim().min(1).default('mock')
}).transform((env) => ({
  ...env,
  DIRECT_URL: env.DIRECT_URL ?? env.DATABASE_URL,
  AUTH_URL: env.AUTH_URL ?? env.NEXTAUTH_URL ?? env.NEXT_PUBLIC_APP_URL
}));

function getEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join(', ');

  if (process.env.NODE_ENV !== 'test') {
    console.warn(`[env] Using fallback values because the following environment variables are missing or invalid: ${issues}`);
  }

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
    SMS_ENABLED: process.env.SMS_ENABLED === 'true',
    SMS_PROVIDER: process.env.SMS_PROVIDER ?? 'mock',
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? 'mock'
  } as z.infer<typeof envSchema>;
}

export const env = getEnv();
