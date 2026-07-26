import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export async function POST(request: Request) {
  const session = await requireRole(['ADMIN']);
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const imageFile = formData.get('imageFile');
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }

  const originalArrayBuffer = await imageFile.arrayBuffer();
  const originalBuffer = Buffer.from(originalArrayBuffer);
  let fileBuffer = originalBuffer;
  let fileExtension = path.extname(imageFile.name).toLowerCase() || '.png';
  let contentType = imageFile.type || 'image/png';

  try {
    const sharpModule = (await import('sharp')).default ?? (await import('sharp'));
    fileBuffer = await sharpModule(originalBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    fileExtension = '.webp';
    contentType = 'image/webp';
  } catch {
    if (!fileExtension) fileExtension = '.png';
  }

  const fileName = `${randomUUID()}${fileExtension}`;
  const filePath = `admin/${session.user.id ?? 'unknown'}/${fileName}`;

  const supabaseAdmin = getSupabaseAdmin();
  const { error: uploadError } = await supabaseAdmin.storage
    .from('party-images')
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: false
    });

  if (uploadError) {
    return NextResponse.json({ error: 'upload_failed', message: uploadError.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from('party-images').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    return NextResponse.json({ error: 'public_url_failed' }, { status: 500 });
  }

  return NextResponse.json({ url: data.publicUrl });
}
