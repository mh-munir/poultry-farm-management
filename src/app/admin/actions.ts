'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/server/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import sharp from 'sharp';
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

export async function updateAdminCredentials(formData: FormData): Promise<UpdateAdminResult> {
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
    return { error: message };
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

  if (imageFile instanceof File && imageFile.size > 0) {
    if (!imageFile.type.startsWith('image/')) {
      return { error: 'Please upload a valid image file.' };
    }

    try {
      const originalBuffer = Buffer.from(await imageFile.arrayBuffer());
      let finalBuffer: Buffer = originalBuffer;

      try {
        finalBuffer = await sharp(originalBuffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
      } catch {
        // sharp failed, fall back to the original image buffer
      }

      const userId = session.user.id ?? 'unknown';
      const fileName = `${randomUUID()}.webp`;
      const filePath = `admin/${userId}/${fileName}`;

      const supabaseAdmin = getSupabaseAdmin();
      const { error: uploadError } = await supabaseAdmin.storage
        .from('party-images')
        .upload(filePath, finalBuffer, {
          contentType: 'image/webp',
          upsert: false
        });

      if (uploadError) {
        return { error: 'Unable to upload admin image.' };
      }

      const { data: urlData } = supabaseAdmin.storage.from('party-images').getPublicUrl(filePath);
      updatePayload.image = urlData.publicUrl;
    } catch (err) {
      return { error: 'Unable to upload admin image.' };
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
    return { error: 'Unable to update admin credentials.' };
  }

  return { success: 'Admin credentials updated successfully.' };
}