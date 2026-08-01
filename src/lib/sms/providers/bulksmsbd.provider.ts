import type { SmsProvider } from '../types';

const API_KEY = process.env.BULKSMSBD_API_KEY!;
const SENDER_ID = process.env.BULKSMSBD_SENDER_ID!;
const API_URL = process.env.BULKSMSBD_API_URL!;

export const BulkSmsBdProvider: SmsProvider = {
  name: 'bulksmsbd',

  async sendSms(phoneNumber: string, message: string) {
    try {
      if (!API_KEY) {
        return {
          status: 'FAILED',
          errorMessage: 'BULKSMSBD_API_KEY is missing',
        };
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: API_KEY,
          senderid: SENDER_ID,
          number: phoneNumber,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          status: 'FAILED',
          errorMessage: data?.message ?? 'SMS sending failed',
        };
      }

      return {
        status: 'SENT',
        providerMessageId: String(data?.message_id ?? ''),
      };
    } catch (error) {
      return {
        status: 'FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown SMS error',
      };
    }
  },
};