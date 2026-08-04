import type { SmsProvider } from '../types';
import { sendSMS } from '../bulksmsbd';

function extractProviderMessageId(response: unknown) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return undefined;
  }

  const body = response as Record<string, unknown>;
  const messageId = body.message_id ?? body.messageId ?? body.sms_id ?? body.smsId ?? body.response_code;

  return messageId === undefined || messageId === null ? undefined : String(messageId);
}

export const BulkSmsBdProvider: SmsProvider = {
  name: 'bulksmsbd',

  async sendSms(phoneNumber: string, message: string) {
    const result = await sendSMS(phoneNumber, message);

    if (!result.success) {
      return {
        status: 'FAILED',
        errorMessage: result.error ?? 'BulkSMSBD SMS sending failed'
      };
    }

    return {
      status: 'SENT',
      providerMessageId: extractProviderMessageId(result.response)
    };
  },
};
