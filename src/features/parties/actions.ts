'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'node:crypto';

const partySchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, 'Party name is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  taxNumber: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  openingBalance: z.coerce.number().default(0),
  isActive: z.preprocess((val) => val === 'on' || val === true, z.boolean()),
  existingImageUrl: z.string().optional()
});

const BUCKET_NAME = 'party-images';

async function uploadPartyImage(partyId: number, imageFile: File): Promise<string> {
  const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
  const fileExtension = imageFile.name.split('.').pop() || 'webp';
  const fileName = `${randomUUID()}.${fileExtension}`;
  const filePath = `${partyId}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: imageFile.type,
      upsert: true
    });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    throw new Error('Failed to upload party image.');
  }

  const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error('Could not get public URL for uploaded image.');
  }

  return data.publicUrl;
}

async function deleteOldImage(imageUrl: string | null | undefined) {
  if (!imageUrl) return;

  try {
    const url = new URL(imageUrl);
    // The path in Supabase Storage is everything after the bucket name.
    // e.g., https://<...>.supabase.co/storage/v1/object/public/party-images/1/uuid.webp
    // The path to delete is '1/uuid.webp'
    const pathToDelete = url.pathname.split(`/${BUCKET_NAME}/`)[1];

    if (pathToDelete) {
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([pathToDelete]);
    }
  } catch (error) {
    // Log the error but don't block the update if deletion fails
    console.error('Failed to delete old party image from Supabase Storage:', error);
  }
}

export async function createOrUpdatePartyWithToast(formData: FormData) {
  await requireUser();

  const rawData = Object.fromEntries(formData.entries());
  const parsed = partySchema.safeParse(rawData);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? 'Invalid data provided.' };
  }

  const { id, existingImageUrl, ...data } = parsed.data;
  const imageFile = formData.get('image') as File | null;

  try {
    const party = await prisma.party.upsert({
      where: { id: id ?? -1 },
      create: {
        ...data,
        imageUrl: null // Set to null initially, will be updated after upload
      },
      update: {
        ...data
      }
    });

    let newImageUrl = existingImageUrl || party.imageUrl;

    // Handle image upload if a new file is provided
    if (imageFile && imageFile.size > 0) {
      // Delete the old image from Supabase Storage if it exists
      await deleteOldImage(existingImageUrl);

      // Upload the new image and get its public URL
      newImageUrl = await uploadPartyImage(party.id, imageFile);

      // Update the party record with the new image URL
      await prisma.party.update({
        where: { id: party.id },
        data: { imageUrl: newImageUrl }
      });
    }

    revalidatePath('/dashboard/parties');

    return {
      success: true,
      message: `Party '${data.name}' ${id ? 'updated' : 'created'} successfully.`
    };
  } catch (error: any) {
    console.error('Error creating/updating party:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred.'
    };
  }
}

export async function deleteParty(formData: FormData) {
  // This is a placeholder for the existing deleteParty action.
  // You would add logic here to also delete the image from Supabase Storage.
  console.log('deleteParty action called. Implement deletion logic.');
}