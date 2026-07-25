import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export async function POST(request: Request) {
  const session = await requireRole(['ADMIN'])

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'invalid_form' }, { status: 400 })

  const imageFile = formData.get('imageFile')
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 })
  }

  try {
    // In serverless environments, only the /tmp directory is writable.
    // process.cwd() is read-only.
    const uploadDir = path.join('/tmp', 'uploads', 'admin')
    await mkdir(uploadDir, { recursive: true })
    const originalExt = path.extname(imageFile.name) || '.png'
    const originalArrayBuffer = await imageFile.arrayBuffer()
    const originalInput = new Uint8Array(originalArrayBuffer)

    let finalFile: Uint8Array = originalInput
    let finalExt = originalExt

    try {
      const sharpModule = (await import('sharp')).default ?? (await import('sharp'))
      const outputBuffer = await sharpModule(originalInput)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()

      finalFile = outputBuffer
      finalExt = '.webp'
    } catch {}

    const fileName = `${randomUUID()}${finalExt}`
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, finalFile)

    // The URL should still point to the public path where the file will be served from,
    // but the file is written to /tmp. You'll need an external storage service
    // like an S3 bucket to persist and serve these files in a production serverless environment.
    const url = `/uploads/admin/${fileName}` // This will not work for serving the file from /tmp.
    return NextResponse.json({ url })
  } catch (err: any) {
    return NextResponse.json({ error: 'upload_failed', message: String(err?.message ?? err) }, { status: 500 })
  }
}
