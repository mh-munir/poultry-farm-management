'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { dbQuery, prisma } from '@/server/db';

function buildResetAdminRoute(searchParams: URLSearchParams): `/auth/reset-admin?${string}` {
  return `/auth/reset-admin?${searchParams.toString()}`;
}

function buildSignInRoute(searchParams: URLSearchParams): `/auth/sign-in?${string}` {
  return `/auth/sign-in?${searchParams.toString()}`;
}

const resetAdminSchema = z
  .object({
    email: z.string().email(),
    resetToken: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Password confirmation does not match.'
      });
    }
  });

export async function resetAdminPassword(formData: FormData) {
  const email = formData.get('email')?.toString() ?? '';
  const resetToken = formData.get('resetToken')?.toString() ?? '';
  const password = formData.get('password')?.toString() ?? '';
  const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

  const parsed = resetAdminSchema.safeParse({ email, resetToken, password, confirmPassword });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    const params = new URLSearchParams();
    params.set('error', message);
    redirect(buildResetAdminRoute(params));
  }

  const configuredToken = process.env.ADMIN_RESET_TOKEN ?? '';

  if (!configuredToken) {
    const params = new URLSearchParams();
    params.set('error', 'Admin reset is not configured. Set ADMIN_RESET_TOKEN in the environment.');
    redirect(buildResetAdminRoute(params));
  }

  if (resetToken !== configuredToken) {
    const params = new URLSearchParams();
    params.set('error', 'Invalid reset token.');
    redirect(buildResetAdminRoute(params));
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  try {
    console.log('🔄 Attempting password reset for:', parsed.data.email);

    const existingUser = await dbQuery(
      prisma.user.findUnique({ where: { email: parsed.data.email } }),
      30000
    );

    if (!existingUser) {
      const params = new URLSearchParams();
      params.set('error', 'No admin user exists for that email.');
      redirect(buildResetAdminRoute(params));
    }

    await dbQuery(
      prisma.user.update({
        where: { email: parsed.data.email },
        data: {
          role: 'ADMIN',
          password: hashedPassword
        }
      }),
      30000
    );

    console.log('✅ Password reset successful for:', parsed.data.email);
  } catch (error) {
    console.error('❌ Password reset failed:', error instanceof Error ? error.message : String(error));
    const params = new URLSearchParams();
    params.set('error', 'Unable to reset admin password. ' + (error instanceof Error ? error.message : 'Unknown error'));
    redirect(buildResetAdminRoute(params));
  }

  const successParams = new URLSearchParams();
  successParams.set('success', 'Admin password has been reset. Sign in with your new password.');
  redirect(buildSignInRoute(successParams));
}
