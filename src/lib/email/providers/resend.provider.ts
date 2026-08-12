import { Resend } from 'resend';
import type { EmailProvider } from '../types';

type ResendClientLike = {
  emails: {
    send: (payload: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text: string;
    }) => Promise<{ data?: { id?: string } | null; error?: { message?: string | null } | null }>;
  };
};

function getResendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim(),
    fromEmail: process.env.RESEND_FROM_EMAIL?.trim()
  };
}

function getMissingConfigError() {
  const { apiKey, fromEmail } = getResendConfig();
  const missing: string[] = [];
  if (!apiKey) missing.push('RESEND_API_KEY');
  if (!fromEmail) missing.push('RESEND_FROM_EMAIL');
  return missing.length ? `Missing Resend configuration: ${missing.join(', ')}` : null;
}

function createResendClient(apiKey: string): ResendClientLike {
  return new Resend(apiKey) as unknown as ResendClientLike;
}

export function createResendEmailProvider(clientFactory: (apiKey: string) => ResendClientLike = createResendClient): EmailProvider {
  return {
    name: 'resend',
    async sendOtpEmail(contact, otpCode) {
      const missingConfigError = getMissingConfigError();
      if (missingConfigError) {
        return { status: 'FAILED', errorMessage: missingConfigError };
      }

      const { apiKey, fromEmail } = getResendConfig();
      const resend = clientFactory(apiKey!);
      const subject = 'Super Admin transfer verification';
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Super Admin transfer verification</h2>
          <p>Your verification code is <strong>${otpCode}</strong>.</p>
          <p>This code expires in 5 minutes.</p>
          <p>If you did not request this transfer, do not share this code.</p>
        </div>
      `;
      const text = `Super Admin transfer verification\nYour verification code is ${otpCode}.\nThis code expires in 5 minutes.\nIf you did not request this transfer, do not share this code.`;

      try {
        const response = await resend.emails.send({
          from: fromEmail!,
          to: [contact],
          subject,
          html,
          text
        });

        if (response.error) {
          return { status: 'FAILED', errorMessage: response.error.message ?? 'Resend email delivery failed.' };
        }

        return { status: 'SENT' };
      } catch (error) {
        return { status: 'FAILED', errorMessage: error instanceof Error ? error.message : 'Resend email delivery failed.' };
      }
    }
  };
}

export const ResendEmailProvider = createResendEmailProvider();
