import type { SmsProvider } from '../types';

const API_KEY = process.env.BULKSMSBD_API_KEY!;
const SENDER_ID = process.env.BULKSMSBD_SENDER_ID!;
const API_URL = process.env.BULKSMSBD_API_URL?.replace('/getBalanceApi', '/api') || 'https://bulksmsbd.net/api';

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

      const text = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        return {
          status: 'FAILED',
          errorMessage: data?.message ?? data?.response_message ?? data?.error ?? 'SMS sending failed',
        };
      }

      return {
        status: 'SENT',
        providerMessageId: String(data?.message_id ?? data?.response_code ?? ''),
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