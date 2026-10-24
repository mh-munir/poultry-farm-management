'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/server/db';
import { createOtp, verifyOtp, clearOtp } from '@/lib/otp';
import { sendOtp } from '@/lib/notifications';
import { validatePasswordResetPayload } from '@/lib/password-reset';

function buildRoute(searchParams: URLSearchParams): `/auth/forgot-password?${string}` {
  return `/auth/forgot-password?${searchParams.toString()}`;
}

function buildSignInRoute(searchParams: URLSearchParams): `/auth/sign-in?${string}` {
  return `/auth/sign-in?${searchParams.toString()}`;
}

export async function sendPasswordResetOtp(formData: FormData) {
  const email = formData.get('email')?.toString() ?? '';

  if (!email.trim()) {
    const params = new URLSearchParams();
    params.set('error', 'Please enter your email address.');
    redirect(buildRoute(params));
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const params = new URLSearchParams();
    params.set('error', 'No account was found for that email address.');
    redirect(buildRoute(params));
  }

  try {
    const result = await createOtp(email, user.id, 'EMAIL');
    const delivery = await sendOtp({ contact: email, code: result.code, channel: 'EMAIL' });
    if (delivery.status !== 'SENT' && delivery.status !== 'QUEUED') {
      throw new Error('Unable to deliver a verification code.');
    }
  } catch (error) {
    const params = new URLSearchParams();
    params.set('error', error instanceof Error ? error.message : 'Unable to send OTP.');
    redirect(buildRoute(params));
  }

  const params = new URLSearchParams();
  params.set('email', email);
  params.set('step', 'verify');
  params.set('success', 'A verification code has been sent to your email.');
  redirect(buildRoute(params));
}

export async function resetPasswordWithOtp(formData: FormData) {
  const payload = {
    email: formData.get('email')?.toString() ?? '',
    otpCode: formData.get('otpCode')?.toString() ?? '',
    password: formData.get('password')?.toString() ?? '',
    confirmPassword: formData.get('confirmPassword')?.toString() ?? ''
  };

  const validation = validatePasswordResetPayload(payload);
  if (!validation.success) {
    const params = new URLSearchParams();
    params.set('email', payload.email);
    params.set('step', 'verify');
    params.set('error', validation.error);
    redirect(buildRoute(params));
  }

  const user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    const params = new URLSearchParams();
    params.set('error', 'No account was found for that email address.');
    redirect(buildRoute(params));
  }

  if (!(await verifyOtp(payload.email, payload.otpCode))) {
    const params = new URLSearchParams();
    params.set('email', payload.email);
    params.set('step', 'verify');
    params.set('error', 'Invalid or expired OTP. Please request a new one.');
    redirect(buildRoute(params));
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    await clearOtp(payload.email);
  });

  const params = new URLSearchParams();
  params.set('success', 'Password reset successful. Please sign in with your new password.');
  redirect(buildSignInRoute(params));
}
