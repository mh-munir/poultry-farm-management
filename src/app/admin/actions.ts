'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/server/db';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireRole } from '@/lib/auth';

type UpdateAdminResult = {
  success?: string;
  error?: string;
  newImageUrl?: string | null;
  newName?: string | null;
};

const updateAdminSchema = z
  .object({
    name: z.string().min(1).max(100),
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
  const name = formData.get('name')?.toString() ?? '';
  const existingImageUrl = formData.get('existingImageUrl')?.toString() ?? '';
  const imageFile = formData.get('imageFile');

  const parsed = updateAdminSchema.safeParse({ name, email, password, confirmPassword });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    redirect(`/admin?error=${encodeURIComponent(message)}`);
  }

  const data = parsed.data;

  const updatePayload: { name?: string | null; image?: string | null; email: string; password?: string; role: string } = {
    name: data.name?.trim() ?? null,
    image: null,
    email: data.email,
    role: 'ADMIN'
  };

  if (data.password?.trim()) {
    updatePayload.password = await bcrypt.hash(data.password.trim(), 10);
  }

  // If an image file was uploaded, save it to public/uploads/admin and use that URL
  if (imageFile instanceof File && imageFile.size > 0) {
    if (!imageFile.type.startsWith('image/')) {
      redirect('/admin?error=Please%20upload%20a%20valid%20image%20file.');
    }

    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'admin');
      await mkdir(uploadDir, { recursive: true });
      const originalExt = path.extname(imageFile.name) || '.png';
      const originalBuffer = Buffer.from(await imageFile.arrayBuffer());

      let finalBuffer: Buffer<ArrayBufferLike> = originalBuffer;
      let finalExt = originalExt;

      try {
        const sharpModule = (await import('sharp')).default ?? (await import('sharp'));
        // resize to max width and compress to JPEG for smaller size
        finalBuffer = await sharpModule(originalBuffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        finalExt = '.webp';
      } catch (sharpErr) {
        // sharp not available or failed — fall back to original buffer
      }

      const fileName = `${randomUUID()}${finalExt}`;
      const filePath = path.join(uploadDir, fileName);
      await writeFile(filePath, finalBuffer);
      updatePayload.image = `/uploads/admin/${fileName}`;
    } catch (err) {
      redirect('/admin?error=Unable%20to%20upload%20admin%20image.');
    }
  } else if (existingImageUrl) {
    updatePayload.image = existingImageUrl;
  } else {
    updatePayload.image = null;
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id ?? '' },
      data: updatePayload
    });
  } catch (error) {
    redirect('/admin?error=Unable%20to%20update%20admin%20credentials.');
  }

  revalidatePath('/admin');
  redirect('/admin?success=Admin%20credentials%20updated%20successfully.');
}
