'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/server/db';
import { requireRole } from '@/lib/auth';

const updateAdminSchema = z
  .object({
    email: z.string().email(),
    password: z.string().max(128).optional(),
    confirmPassword: z.string().max(128).optional()
  })
  .superRefine((data, ctx) => {
    const password = data.password?.trim() ?? '';
    const confirmPassword = data.confirmPassword?.trim() ?? '';

    if (password || confirmPassword) {
      if (!password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'New password is required when changing password.'
        });
      }

      if (!confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confirmPassword'],
          message: 'Please confirm the new password.'
        });
      }

      if (password && password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Password must be at least 8 characters long.'
        });
      }

      if (password && confirmPassword && password !== confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confirmPassword'],
          message: 'Password confirmation does not match.'
        });
      }
    }
  });

export async function updateAdminCredentials(formData: FormData) {
  const session = await requireRole(['ADMIN']);
  const email = formData.get('email')?.toString() ?? '';
  const password = formData.get('password')?.toString() ?? '';
  const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

  const parsed = updateAdminSchema.safeParse({ email, password, confirmPassword });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    const url = new URL('/admin', 'http://localhost');
    url.searchParams.set('error', message);
    // @ts-expect-error dynamic query params are allowed here
    redirect(url.toString());
  }

  const data = parsed.data;

  const updatePayload: { email: string; password?: string; role: string } = {
    email: data.email,
    role: 'ADMIN'
  };

  if (data.password?.trim()) {
    updatePayload.password = await bcrypt.hash(data.password.trim(), 10);
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id ?? '' },
      data: updatePayload
    });
  } catch (error) {
    const url = new URL('/admin', 'http://localhost');
    url.searchParams.set('error', 'Unable to update admin credentials.');
    // @ts-expect-error dynamic query params are allowed here
    redirect(url.toString());
  }

  revalidatePath('/admin');
  const url = new URL('/admin', 'http://localhost');
  url.searchParams.set('success', 'Admin credentials updated successfully.');
  // @ts-expect-error dynamic query params are allowed here
  redirect(url.toString());
}
