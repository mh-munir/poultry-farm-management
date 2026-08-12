import { z } from 'zod';

export const passwordResetSchema = z
  .object({
    email: z.string().trim().email('Please enter a valid email address.'),
    otpCode: z.string().trim().length(6, 'OTP must be 6 digits.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm your password.')
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

export type PasswordResetPayload = {
  email: string;
  otpCode: string;
  password: string;
  confirmPassword: string;
};

export function validatePasswordResetPayload(payload: PasswordResetPayload) {
  const parsed = passwordResetSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Validation failed.' };
  }

  return { success: true as const, data: parsed.data };
}
