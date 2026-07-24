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
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'admin')
    await mkdir(uploadDir, { recursive: true })
    const originalExt = path.extname(imageFile.name) || '.png'
    const originalBuffer = Buffer.from(await imageFile.arrayBuffer())

    let finalBuffer = originalBuffer
    let finalExt = originalExt

    try {
      const sharpModule = (await import('sharp')).default ?? (await import('sharp'))
      finalBuffer = await sharpModule(originalBuffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
      finalExt = '.webp'
    } catch {}

    const fileName = `${randomUUID()}${finalExt}`
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, finalBuffer)

    const url = `/uploads/admin/${fileName}`
    return NextResponse.json({ url })
  } catch (err: any) {
    return NextResponse.json({ error: 'upload_failed', message: String(err?.message ?? err) }, { status: 500 })
  }
}
