import { Prisma, type SmsNotificationStatus } from '@prisma/client';
import { env } from '@/lib/env';
import { prisma } from '@/server/db';
import { createSaleSmsMessage } from './templates';
import type { QueueSaleSmsInput, QueueTransactionSmsInput, QueueSaleSmsResult } from './types';
import { getSmsProvider } from './providers';

const NO_VALID_PHONE_REASON = 'Recipient has no valid mobile number';

function normalizePhoneNumber(phoneNumber?: string | null) {
  const normalized = phoneNumber?.replace(/[^\d+]/g, '').trim() ?? '';
  const digitCount = normalized.replace(/\D/g, '').length;

  if (digitCount < 7 || digitCount > 15) {
    return null;
  }

  return normalized;
}

async function safeUpdateSmsStatus({
  notificationId,
  transactionId,
  status,
  providerMessageId,
  errorMessage,
  sentAt
}: {
  notificationId?: number | null;
  transactionId?: number | null;
  status: SmsNotificationStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sentAt?: Date | null;
}) {
  if (!notificationId && !transactionId) {
    return;
  }

  try {
    if (notificationId) {
      await prisma.smsNotification.update({
        where: { id: notificationId },
        data: {
          status,
          providerMessageId: providerMessageId ?? null,
          errorMessage: errorMessage ?? null,
          sentAt: sentAt ?? null
        }
      });
      return;
    }

    if (transactionId) {
      await prisma.smsNotification.update({
        where: { transactionId },
        data: {
          status,
          providerMessageId: providerMessageId ?? null,
          errorMessage: errorMessage ?? null,
          sentAt: sentAt ?? null
        }
      });
    }
  } catch (error) {
    console.error('Failed to update SMS notification status.', error);
  }
}

async function safeQueueTransactionSmsNotification(input: QueueTransactionSmsInput): Promise<QueueSaleSmsResult> {
  try {
    return await queueTransactionSmsNotification(input);
  } catch (error) {
    console.error('SMS notification failed after business transaction completed.', error);

    return {
      status: 'FAILED',
      message: input.message,
      errorMessage: error instanceof Error ? error.message : 'SMS notification failed'
    };
  }
}

export async function queueTransactionSmsNotification(input: QueueTransactionSmsInput): Promise<QueueSaleSmsResult> {
  const providerName = env.SMS_PROVIDER || 'mock';
  const message = input.message;
  const normalizedPhoneNumber = normalizePhoneNumber(input.phoneNumber);

  try {
    const existingNotification = input.transactionId
      ? await prisma.smsNotification.findUnique({
          where: { transactionId: input.transactionId },
          select: { id: true, status: true, errorMessage: true }
        })
      : null;

    if (existingNotification) {
      return {
        status: existingNotification.status,
        message,
        notificationId: existingNotification.id,
        errorMessage: existingNotification.errorMessage
      };
    }

    if (!normalizedPhoneNumber) {
      const skippedNotification = await prisma.smsNotification.create({
        data: {
          partyId: input.partyId ?? null,
          companyId: input.companyId ?? null,
          transactionId: input.transactionId ?? null,
          phoneNumber: input.phoneNumber?.trim() || null,
          saleType: input.saleType ?? 'MIXED',
          message,
          status: 'SKIPPED',
          provider: providerName,
          errorMessage: NO_VALID_PHONE_REASON
        },
        select: { id: true, status: true, errorMessage: true }
      });

      return {
        status: skippedNotification.status,
        message,
        notificationId: skippedNotification.id,
        errorMessage: skippedNotification.errorMessage
      };
    }

    const initialStatus: SmsNotificationStatus = env.SMS_ENABLED ? 'QUEUED' : 'PENDING';
    const notification = await prisma.smsNotification.create({
      data: {
        partyId: input.partyId ?? null,
        companyId: input.companyId ?? null,
        transactionId: input.transactionId ?? null,
        phoneNumber: normalizedPhoneNumber,
        saleType: input.saleType ?? 'MIXED',
        message,
        status: initialStatus,
        provider: providerName,
        errorMessage: env.SMS_ENABLED ? null : 'SMS is currently disabled'
      },
      select: { id: true, status: true, errorMessage: true }
    });

    if (!env.SMS_ENABLED) {
      return {
        status: notification.status,
        message,
        notificationId: notification.id,
        errorMessage: notification.errorMessage
      };
    }

    try {
      const provider = getSmsProvider(providerName);
      const providerResult = await provider.sendSms(normalizedPhoneNumber, message);

      await safeUpdateSmsStatus({
        notificationId: notification.id,
        transactionId: input.transactionId,
        status: providerResult.status,
        providerMessageId: providerResult.providerMessageId,
        errorMessage: providerResult.errorMessage,
        sentAt: providerResult.status === 'SENT' ? new Date() : null
      });

      return {
        status: providerResult.status,
        message,
        notificationId: notification.id,
        errorMessage: providerResult.errorMessage ?? null
      };
    } catch (providerError) {
      const providerErrorMessage = providerError instanceof Error ? providerError.message : 'SMS provider failed';

      await safeUpdateSmsStatus({
        notificationId: notification.id,
        transactionId: input.transactionId,
        status: 'FAILED',
        errorMessage: providerErrorMessage
      });

      return {
        status: 'FAILED',
        message,
        notificationId: notification.id,
        errorMessage: providerErrorMessage
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'SMS notification processing failed';

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existingNotification = input.transactionId
        ? await prisma.smsNotification.findUnique({
            where: { transactionId: input.transactionId },
            select: { id: true, status: true, errorMessage: true }
          })
        : null;

      if (existingNotification) {
        return {
          status: existingNotification.status,
          message,
          notificationId: existingNotification.id,
          errorMessage: existingNotification.errorMessage
        };
      }
    }

    console.error('SMS notification processing failed.', error);
    return {
      status: 'FAILED',
      message,
      errorMessage
    };
  }
}

export async function queueSaleSmsNotification(input: QueueSaleSmsInput): Promise<QueueSaleSmsResult> {
  const message = createSaleSmsMessage(input);

  return safeQueueTransactionSmsNotification({
    partyId: input.partyId,
    transactionId: input.transactionId,
    phoneNumber: input.phoneNumber,
    partyName: input.partyName,
    message,
    saleType: input.saleType,
    transactionType: 'SALE'
  });
}

export function getSaleSmsSuccessMessage(status: SmsNotificationStatus) {
  if (status === 'SKIPPED') {
    return 'Sale completed successfully. SMS skipped because the Party has no valid mobile number.';
  }

  if (!env.SMS_ENABLED) {
    return 'Sale completed successfully. SMS is currently disabled. The notification has been saved for future API integration.';
  }

  if (status === 'FAILED') {
    return 'Sale completed successfully. SMS notification could not be queued, but the sale was saved.';
  }

  return 'Sale completed successfully. SMS notification queued for future sending.';
}
