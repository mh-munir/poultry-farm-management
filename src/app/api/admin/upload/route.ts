import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const role = (session.user.role ?? 'USER') as string;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const imageFile = formData.get('imageFile');
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }
  if (imageFile.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type)) {
    return NextResponse.json({ error: 'unsupported_file_type' }, { status: 400 });
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
    return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
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
    console.error('Admin image upload failed', uploadError);
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from('party-images').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    return NextResponse.json({ error: 'public_url_failed' }, { status: 500 });
  }

  return NextResponse.json({ url: data.publicUrl });
}
