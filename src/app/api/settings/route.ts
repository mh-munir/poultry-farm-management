import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { requireUser } from '@/lib/auth'

const payloadSchema = z.object({ key: z.string().min(1), value: z.any() })

export async function GET(request: Request) {
  const url = new URL(request.url)
  const key = url.searchParams.get('key')

  try {
    if (key) {
      const record = await (prisma as any).setting.findUnique({ where: { key } })
      if (!record) return NextResponse.json({ key, value: null })
      return NextResponse.json({ key: record.key, value: record.value })
    }

    const all = await (prisma as any).setting.findMany()
    const data: Record<string, any> = {}
    for (const r of all) data[r.key] = r.value
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: 'settings_unavailable', message: err?.message ?? String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireUser()
  const body = await request.json().catch(() => null)
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const { key, value } = parsed.data

  try {
    const upserted = await (prisma as any).setting.upsert({
      where: { key },
      update: { value, updatedById: session.user.id ?? null },
      create: { key, value, updatedById: session.user.id ?? null }
    })

    return NextResponse.json({ key: upserted.key, value: upserted.value })
  } catch (err: any) {
    return NextResponse.json({ error: 'settings_save_failed', message: err?.message ?? String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const key = url.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'missing_key' }, { status: 400 })

  try {
    await (prisma as any).setting.delete({ where: { key } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'settings_delete_failed', message: err?.message ?? String(err) }, { status: 500 })
  }
}
