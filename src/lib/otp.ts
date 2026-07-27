import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/server/db';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateCode(length = OTP_LENGTH): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(randomBytes(4).readUInt32BE(0) / (0xffffffff + 1) * (max - min + 1)) + min);
}
export async function createOtp(contact: string, superAdminId: string, deliveryMethod: 'EMAIL' | 'SMS') {
  const existing = await prisma.adminCreationOtp.findUnique({
    where: { contact }
  });

  if (existing) {
    const now = Date.now();
    const cooldownEnd = new Date(existing.resendCooldown.getTime() + RESEND_COOLDOWN_MS);

    if (now < cooldownEnd.getTime()) {
      const remaining = Math.ceil((cooldownEnd.getTime() - now) / 1000);
      throw new Error(`Please wait ${remaining}s before requesting another OTP.`);
    }

    if (existing.verifiedAt) {
      await prisma.adminCreationOtp.delete({ where: { id: existing.id } });
    } else if (existing.expiresAt > new Date()) {
      const attempts = existing.attempts;
      await prisma.adminCreationOtp.update({
        where: { id: existing.id },
        data: { attempts, resendCooldown: new Date(now) }
      });
    } else {
      await prisma.adminCreationOtp.delete({ where: { id: existing.id } });
    }
  }

  const code = generateCode();
  const otpHash = hashOtp(code);
  const now = Date.now();
  const expiresAt = new Date(now + OTP_TTL_MS);
  const resendCooldown = new Date(now);

  const record = await prisma.adminCreationOtp.create({
    data: {
      superAdminId,
      contact,
      deliveryMethod,
      otpHash,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      resendCooldown,
      expiresAt
    }
  });

  return { code, record: { contact, expiresAt, deliveryMethod } };
}

export async function verifyOtp(contact: string, code: string): Promise<boolean> {
  const record = await prisma.adminCreationOtp.findUnique({
    where: { contact }
  });

  if (!record) return false;

  if (record.verifiedAt) return false;

  if (record.expiresAt < new Date()) {
    await prisma.adminCreationOtp.delete({ where: { id: record.id } });
    return false;
  }

  if (record.attempts >= record.maxAttempts) {
    await prisma.adminCreationOtp.delete({ where: { id: record.id } });
    return false;
  }

  const otpHash = hashOtp(code);

  if (otpHash !== record.otpHash) {
    const newAttempts = record.attempts + 1;

    if (newAttempts >= record.maxAttempts) {
      await prisma.adminCreationOtp.delete({ where: { id: record.id } });
    } else {
      await prisma.adminCreationOtp.update({
        where: { id: record.id },
        data: { attempts: newAttempts }
      });
    }

    return false;
  }

  await prisma.adminCreationOtp.update({
    where: { id: record.id },
    data: {
      verifiedAt: new Date(),
      attempts: record.attempts + 1
    }
  });

  return true;
}

export async function clearOtp(contact: string) {
  await prisma.adminCreationOtp.deleteMany({
    where: { contact }
  });
}