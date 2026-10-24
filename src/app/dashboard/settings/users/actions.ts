'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/server/db';
import { requireRole } from '@/lib/auth';
import { createOtp, verifyOtp } from '@/lib/otp';
import { sendOtp } from '@/lib/notifications';
import { createHash, randomInt } from 'node:crypto';

const TRANSFER_OTP_TTL_MS = 5 * 60 * 1000;
const TRANSFER_MAX_ATTEMPTS = 5;

function transferOtp() { return String(randomInt(100000, 1000000)); }
function transferOtpHash(code: string) { return createHash('sha256').update(code).digest('hex'); }

export async function beginSuperAdminTransfer(): Promise<{ transferId?: string; error?: string }> {
  const session = await requireRole(['SUPER_ADMIN']);
  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, phone: true, role: true } });
  if (!current || current.role !== 'SUPER_ADMIN' || !current.phone) return { error: 'A verified mobile number is required.' };
  const code = transferOtp();
  const now = new Date();
  const transfer = await prisma.$transaction(async (tx) => {
    const active = await tx.superAdminTransfer.findFirst({ where: { previousSuperAdminId: current.id, status: { in: ['CURRENT_OTP_PENDING', 'CURRENT_VERIFIED', 'NEW_OTP_PENDING', 'READY'] } } });
    if (active) throw new Error('A Super Admin transfer is already in progress.');
    return tx.superAdminTransfer.create({ data: { initiatedByUserId: current.id, previousSuperAdminId: current.id, currentOtpHash: transferOtpHash(code), currentOtpExpiresAt: new Date(now.getTime() + TRANSFER_OTP_TTL_MS), currentOtpResendAt: now } });
  }).catch((error) => ({ error: error instanceof Error ? error.message : 'Unable to start transfer.' }));
  if ('error' in transfer) return transfer;
  const delivery = await sendOtp({ contact: current.phone, code, channel: 'SMS' });
  if (delivery.status !== 'SENT') { await prisma.superAdminTransfer.update({ where: { id: transfer.id }, data: { status: 'FAILED', failureReason: 'Current administrator OTP delivery failed.' } }); return { error: 'Unable to deliver verification code.' }; }
  return { transferId: transfer.id };
}

export async function verifyCurrentSuperAdminTransferOtp(transferId: string, code: string): Promise<{ error?: string }> {
  const session = await requireRole(['SUPER_ADMIN']);
  const transfer = await prisma.superAdminTransfer.findFirst({ where: { id: transferId, previousSuperAdminId: session.user.id, status: 'CURRENT_OTP_PENDING' } });
  if (!transfer || !transfer.currentOtpHash || !transfer.currentOtpExpiresAt || transfer.currentOtpExpiresAt < new Date()) return { error: 'OTP is invalid or expired.' };
  if (transfer.currentOtpAttempts >= TRANSFER_MAX_ATTEMPTS) return { error: 'Too many invalid attempts.' };
  if (transferOtpHash(code) !== transfer.currentOtpHash) { await prisma.superAdminTransfer.update({ where: { id: transfer.id }, data: { currentOtpAttempts: { increment: 1 } } }); return { error: 'OTP is invalid or expired.' }; }
  await prisma.superAdminTransfer.update({ where: { id: transfer.id }, data: { status: 'CURRENT_VERIFIED', currentVerifiedAt: new Date(), currentOtpHash: null } });
  return {};
}

export async function selectNewSuperAdmin(transferId: string, newUserId: string): Promise<{ error?: string }> {
  const session = await requireRole(['SUPER_ADMIN']);
  const transfer = await prisma.superAdminTransfer.findFirst({ where: { id: transferId, previousSuperAdminId: session.user.id, status: 'CURRENT_VERIFIED' } });
  const candidate = await prisma.user.findUnique({ where: { id: newUserId }, select: { id: true, email: true, emailVerified: true, role: true } });
  if (!transfer || !candidate || !candidate.email || !candidate.emailVerified || candidate.id === session.user.id || candidate.role === 'SUPER_ADMIN') return { error: 'Select a different user with a verified email.' };
  if (process.env.NODE_ENV === 'production' && (process.env.EMAIL_PROVIDER ?? 'mock').toLowerCase() === 'mock') return { error: 'A production email provider must be configured.' };
  const code = transferOtp();
  const delivery = await sendOtp({ contact: candidate.email, code, channel: 'EMAIL' });
  if (delivery.status !== 'SENT') return { error: 'Unable to deliver verification code.' };
  await prisma.superAdminTransfer.update({ where: { id: transfer.id }, data: { newSuperAdminId: candidate.id, status: 'NEW_OTP_PENDING', newOtpHash: transferOtpHash(code), newOtpExpiresAt: new Date(Date.now() + TRANSFER_OTP_TTL_MS), newOtpResendAt: new Date(), newOtpAttempts: 0 } });
  return {};
}

const sendAdminOtpSchema = z.object({ contact: z.string().email().max(255) });

const verifyAdminOtpSchema = z.object({
  contact: z.string().email().max(255),
  code: z.string().length(6)
});

const createAdminSchema = z
  .object({
    name: z.string().min(2, 'Name is required.'),
    email: z.string().email('A valid email address is required.'),
    phone: z.string().min(7).optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm your password.'),
    contact: z.string().email(),
    channel: z.literal('EMAIL'),
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
  const parsed = sendAdminOtpSchema.safeParse({ contact });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid contact details.' };
  }

  const parsedContact = parsed.data.contact.trim().toLowerCase();
  const existingByEmail = await prisma.user.findUnique({ where: { email: parsedContact } });
  if (existingByEmail) return { error: 'Email is already registered.' };
  if (process.env.NODE_ENV === 'production' && (process.env.EMAIL_PROVIDER ?? 'mock').toLowerCase() !== 'resend') {
    return { error: 'A production email provider must be configured.' };
  }

  try {
    const session = await requireRole(['SUPER_ADMIN']);
    const superAdminId = session.user.id ?? '';
    const result = await createOtp(parsedContact, superAdminId, 'EMAIL');
    const sendResult = await sendOtp({ contact: parsedContact, code: result.code, channel: 'EMAIL' });
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

  const session = await requireRole(['SUPER_ADMIN']);
  const record = await prisma.adminCreationOtp.findFirst({
    where: { contact: parsed.data.contact.trim().toLowerCase(), superAdminId: session.user.id, deliveryMethod: 'EMAIL' }
  });
  if (!record || !(await verifyOtp(record.contact, parsed.data.code))) {
    return { error: 'Invalid OTP.' };
  }

  return { success: true };
}

export type CreateAdminResult = { success: string } | { error: string };

export async function deleteAdminUser(userId: string): Promise<{ success?: string; error?: string }> {
  try {
    const session = await requireRole(['SUPER_ADMIN']);
    const superAdminId = session.user.id;
    if (!superAdminId || !userId || userId === superAdminId) {
      return { error: 'You cannot delete your own Super Admin account.' };
    }

    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true }
      });
      // Super Admin ownership can only change through the dedicated transfer flow.
      if (!target || target.role !== 'ADMIN') throw new Error('Only Admin users can be deleted here.');

      await tx.auditLog.create({
        data: {
          action: 'ADMIN_USER_DELETED',
          actorUserId: superAdminId,
          metadata: { deletedUserId: target.id, email: target.email, role: target.role }
        }
      });
      await tx.user.delete({ where: { id: target.id } });
    });

    return { success: 'Admin user deleted successfully.' };
  } catch (error) {
    if (error instanceof Error && error.message === 'Only Admin users can be deleted here.') return { error: error.message };
    return { error: 'Unable to delete this Admin user.' };
  }
}

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

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
  const existingEmail = parsed.data.email.trim().toLowerCase();
  const normalizedPhone = parsed.data.phone ? parsed.data.phone.replace(/[\s\-()]/g, '') : null;
  const session = await requireRole(['SUPER_ADMIN']);
  const superAdminId = session.user.id;
  if (!superAdminId) return { error: 'Only Super Admin can create Admin accounts.' };

  try {
    const user = await prisma.$transaction(async (tx) => {
      const verifiedOtp = await tx.adminCreationOtp.findFirst({
        where: { contact: existingEmail, superAdminId, deliveryMethod: 'EMAIL', verifiedAt: { not: null }, expiresAt: { gt: new Date() } }
      });
      if (!verifiedOtp) throw new Error('Invalid or expired OTP. Please request a new one.');

      const emailExists = await tx.user.findUnique({ where: { email: existingEmail } });
      if (emailExists) throw new Error('Email is already registered.');

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

      await tx.auditLog.create({
        data: {
          action: 'ADMIN_USER_CREATED',
          actorUserId: superAdminId,
          targetUserId: newUser.id,
          metadata: { email: newUser.email, role: 'ADMIN' }
        }
      });

      await tx.adminCreationOtp.delete({ where: { id: verifiedOtp.id } });

      return newUser;
    });

    return { success: `Admin account created for ${user.name ?? user.email ?? 'user'} successfully.` };
  } catch (error) {
    if (error instanceof Error && (error.message === 'Email is already registered.' || error.message === 'Mobile number is already registered.' || error.message === 'Invalid or expired OTP. Please request a new one.')) {
      return { error: error.message };
    }
    return { error: 'Unable to create admin account.' };
  }
}
