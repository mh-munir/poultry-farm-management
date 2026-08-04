import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { sendSMS } from '@/lib/sms/bulksmsbd';

const testSmsSchema = z.object({
  phoneNumber: z.string().trim().min(1, 'Phone number is required.'),
  message: z.string().trim().min(1, 'Message is required.').max(480, 'Message must be 480 characters or less.')
});

export async function POST(request: Request) {
  await requireUser();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, provider: 'BulkSMSBD', response: null, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const parsed = testSmsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        provider: 'BulkSMSBD',
        response: null,
        error: parsed.error.issues[0]?.message ?? 'Invalid test SMS request.'
      },
      { status: 400 }
    );
  }

  const result = await sendSMS(parsed.data.phoneNumber, parsed.data.message);

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
