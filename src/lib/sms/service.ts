import { Prisma, type SmsNotificationStatus } from '@prisma/client';
import { env } from '@/lib/env';
import { prisma } from '@/server/db';
import { createSaleSmsMessage } from './templates';
import type { QueueSaleSmsInput, QueueTransactionSmsInput, QueueSaleSmsResult } from './types';
import { getSmsProvider } from './providers';

const NO_VALID_PHONE_REASON = 'Recipient has no valid mobile number';

function getSmsRuntimeConfig(providerName: string) {
  const normalizedProviderName = providerName?.trim().toLowerCase() || 'mock';
  const hasBulkSmsBdCredentials = Boolean(
    env.BULKSMSBD_API_KEY?.trim() &&
    env.BULKSMSBD_SENDER_ID?.trim() &&
    env.BULKSMSBD_API_URL?.trim()
  );

  const providerConfigured = normalizedProviderName === 'bulksmsbd' ? hasBulkSmsBdCredentials : false;
  const shouldAttemptSend = Boolean(env.SMS_ENABLED && providerConfigured);

  const reason = !providerConfigured
    ? normalizedProviderName === 'mock'
      ? 'SMS provider is set to mock and will not send real messages.'
      : 'SMS provider is not configured. Missing BulkSMSBD credentials or endpoint.'
    : !env.SMS_ENABLED
      ? 'SMS is disabled in the environment.'
      : null;

  return {
    providerName: normalizedProviderName,
    providerConfigured,
    shouldAttemptSend,
    reason
  };
}

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

async function sendSmsNotificationInBackground({
  notificationId,
  transactionId,
  normalizedPhoneNumber,
  message,
  providerName
}: {
  notificationId: number;
  transactionId?: number | null;
  normalizedPhoneNumber: string;
  message: string;
  providerName: string;
}) {
  try {
    const provider = getSmsProvider(providerName);
    const providerResult = await provider.sendSms(normalizedPhoneNumber, message);

    await safeUpdateSmsStatus({
      notificationId,
      transactionId,
      status: providerResult.status,
      providerMessageId: providerResult.providerMessageId,
      errorMessage: providerResult.errorMessage,
      sentAt: providerResult.status === 'SENT' ? new Date() : null
    });
  } catch (providerError) {
    const providerErrorMessage = providerError instanceof Error ? providerError.message : 'SMS provider failed';

    await safeUpdateSmsStatus({
      notificationId,
      transactionId,
      status: 'FAILED',
      errorMessage: providerErrorMessage
    });

    console.error('[SMS] Background SMS send failed.', {
      notificationId,
      transactionId,
      providerName,
      providerErrorMessage
    });
  }
}

export async function queueTransactionSmsNotification(input: QueueTransactionSmsInput): Promise<QueueSaleSmsResult> {
  const providerName = (env.SMS_PROVIDER || 'mock').trim().toLowerCase();
  const message = input.message;
  const normalizedPhoneNumber = normalizePhoneNumber(input.phoneNumber);
  const smsRuntimeConfig = getSmsRuntimeConfig(providerName);

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

      console.warn('[SMS] Skipping SMS due to invalid or missing recipient phone.', {
        notificationId: skippedNotification.id,
        transactionId: input.transactionId,
        phoneNumber: input.phoneNumber,
        providerName,
        errorMessage: skippedNotification.errorMessage
      });

      return {
        status: skippedNotification.status,
        message,
        notificationId: skippedNotification.id,
        errorMessage: skippedNotification.errorMessage
      };
    }

    const initialStatus: SmsNotificationStatus = smsRuntimeConfig.shouldAttemptSend ? 'QUEUED' : 'PENDING';
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
        errorMessage: smsRuntimeConfig.shouldAttemptSend ? null : (smsRuntimeConfig.reason ?? 'SMS delivery is unavailable')
      },
      select: { id: true, status: true, errorMessage: true }
    });

    console.info('[SMS] Notification queued.', {
      notificationId: notification.id,
      partyId: input.partyId,
      companyId: input.companyId,
      transactionId: input.transactionId,
      phoneNumber: normalizedPhoneNumber,
      providerName,
      status: notification.status,
      errorMessage: notification.errorMessage
    });

    if (!smsRuntimeConfig.shouldAttemptSend) {
      console.warn('[SMS] Skipping SMS delivery.', {
        transactionId: input.transactionId,
        providerName,
        reason: smsRuntimeConfig.reason
      });

      return {
        status: notification.status,
        message,
        notificationId: notification.id,
        errorMessage: notification.errorMessage
      };
    }

    void sendSmsNotificationInBackground({
      notificationId: notification.id,
      transactionId: input.transactionId,
      normalizedPhoneNumber,
      message,
      providerName
    });

    return {
      status: notification.status,
      message,
      notificationId: notification.id,
      errorMessage: notification.errorMessage
    };
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

  if (status === 'PENDING') {
    return 'Sale completed successfully. SMS delivery is pending because the provider is unavailable or not configured.';
  }

  if (status === 'FAILED') {
    return 'Sale completed successfully. SMS notification could not be sent, but the sale was saved.';
  }

  return 'Sale completed successfully. SMS notification has been queued for delivery.';
}
