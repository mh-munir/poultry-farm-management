'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/server/db';
import { requireRole } from '@/lib/auth';
import { createOtp, verifyOtp, clearOtp } from '@/lib/otp';
import { sendOtp } from '@/lib/notifications';

const sendAdminOtpSchema = z.object({
  contact: z.string().min(3).max(255),
  channel: z.enum(['EMAIL', 'SMS'])
});

const verifyAdminOtpSchema = z.object({
  contact: z.string().min(3).max(255),
  code: z.string().length(6)
});

const createAdminSchema = z
  .object({
    name: z.string().min(2, 'Name is required.'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(7).optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm your password.'),
    contact: z.string().min(3),
    channel: z.enum(['EMAIL', 'SMS']),
    otpCode: z.string().length(6)
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

export type SendOtpResult = { success: true } | { error: string };

export async function sendAdminCreationOtp(formData: FormData): Promise<SendOtpResult> {
  try {
    await requireRole(['SUPER_ADMIN']);
  } catch {
    return { error: 'Only Super Admin can send OTP for admin creation.' };
  }

  const contact = formData.get('contact')?.toString() ?? '';
  const channel = (formData.get('channel')?.toString() ?? 'EMAIL') as 'EMAIL' | 'SMS';

  const parsed = sendAdminOtpSchema.safeParse({ contact, channel });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid contact details.' };
  }

  const { contact: parsedContact, channel: parsedChannel } = parsed.data;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^\+?[\d\s\-()]{7,15}$/;

  if (parsedChannel === 'EMAIL' && !emailPattern.test(parsedContact)) {
    return { error: 'Please enter a valid email address.' };
  }

  if (parsedChannel === 'SMS' && !phonePattern.test(parsedContact)) {
    return { error: 'Please enter a valid mobile number.' };
  }

  if (parsedChannel === 'EMAIL') {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: parsedContact }
    });
    if (existingByEmail) {
      return { error: 'Email is already registered.' };
    }
  }

  if (parsedChannel === 'SMS') {
    const normalizedPhone = parsedContact.replace(/[\s\-()]/g, '');
    const existingByPhone = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone
      }
    });
    if (existingByPhone) {
      return { error: 'Mobile number is already registered.' };
    }
  }

  try {
    const session = await requireRole(['SUPER_ADMIN']);
    const superAdminId = session.user.id ?? '';
    const result = await createOtp(parsedContact, superAdminId, parsedChannel);
    const sendResult = await sendOtp({ contact: parsedContact, code: result.code, channel: parsedChannel });
    if (sendResult.status !== 'SENT' && sendResult.status !== 'QUEUED') {
      return { error: 'Unable to send OTP. Please try again.' };
    }
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Please wait')) {
      return { error: error.message };
    }
    return { error: 'Unable to send OTP. Please try again.' };
  }
}

export type VerifyOtpResult = { success: true } | { error: string };

export async function verifyAdminCreationOtp(formData: FormData): Promise<VerifyOtpResult> {
  try {
    await requireRole(['SUPER_ADMIN']);
  } catch {
    return { error: 'Only Super Admin can verify OTP.' };
  }

  const contact = formData.get('contact')?.toString() ?? '';
  const code = formData.get('code')?.toString() ?? '';

  const parsed = verifyAdminOtpSchema.safeParse({ contact, code });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid OTP.' };
  }

  if (!(await verifyOtp(parsed.data.contact, parsed.data.code))) {
    return { error: 'Invalid OTP.' };
  }

  return { success: true };
}

export type CreateAdminResult = { success: string } | { error: string };

export async function createAdminAccount(formData: FormData): Promise<CreateAdminResult> {
  try {
    await requireRole(['SUPER_ADMIN']);
  } catch {
    return { error: 'Only Super Admin can create Admin accounts.' };
  }

  const name = formData.get('name')?.toString() ?? '';
  const email = formData.get('email')?.toString() ?? '';
  const phone = formData.get('phone')?.toString() ?? '';
  const password = formData.get('password')?.toString() ?? '';
  const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';
  const contact = formData.get('contact')?.toString() ?? '';
  const channel = (formData.get('channel')?.toString() ?? 'EMAIL') as 'EMAIL' | 'SMS';
  const otpCode = formData.get('otpCode')?.toString() ?? '';

  const parsed = createAdminSchema.safeParse({
    name,
    email,
    phone,
    password,
    confirmPassword,
    contact,
    channel,
    otpCode
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed.' };
  }

  if (!(await verifyOtp(parsed.data.contact, parsed.data.otpCode))) {
    return { error: 'Invalid or expired OTP. Please request a new one.' };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
  const existingEmail = parsed.data.email || null;
  const normalizedPhone = parsed.data.phone ? parsed.data.phone.replace(/[\s\-()]/g, '') : null;

  try {
    const user = await prisma.$transaction(async (tx) => {
      if (existingEmail) {
        const emailExists = await tx.user.findUnique({
          where: { email: existingEmail }
        });
        if (emailExists) {
          throw new Error('Email is already registered.');
        }
      }

      if (normalizedPhone) {
        const phoneExists = await tx.user.findFirst({
          where: { phone: normalizedPhone }
        });
        if (phoneExists) {
          throw new Error('Mobile number is already registered.');
        }
      }

      const newUser = await tx.user.create({
        data: {
          name: parsed.data.name.trim(),
          email: existingEmail,
          phone: normalizedPhone,
          password: hashedPassword,
          role: 'ADMIN'
        }
      });

      await clearOtp(parsed.data.contact);

      return newUser;
    });

    return { success: `Admin account created for ${user.name ?? user.email ?? 'user'} successfully.` };
  } catch (error) {
    if (error instanceof Error && (error.message === 'Email is already registered.' || error.message === 'Mobile number is already registered.')) {
      return { error: error.message };
    }
    return { error: 'Unable to create admin account.' };
  }
}