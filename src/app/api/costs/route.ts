import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { requireUser } from '@/lib/auth'

const createSchema = z.object({ amount: z.coerce.number(), description: z.string().optional(), date: z.string().optional() })

export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  try {
    const where: any = {}
    if (from || to) where.costDate = {}
    if (from) where.costDate.gte = new Date(from)
    if (to) where.costDate.lte = new Date(to)

    const costs = await (prisma as any).cost.findMany({ where, orderBy: { costDate: 'desc' } })
    return NextResponse.json(costs)
  } catch (err: any) {
    return NextResponse.json({ error: 'costs_unavailable', message: err?.message ?? String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireUser()
  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const { amount, description, date } = parsed.data

  try {
    const created = await (prisma as any).cost.create({
      data: {
        amount,
        description: description ?? null,
        costDate: date ? new Date(date) : undefined,
        createdById: session.user.id ?? null
      }
    })

    return NextResponse.json(created)
  } catch (err: any) {
    return NextResponse.json({ error: 'costs_create_failed', message: err?.message ?? String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  try {
    await (prisma as any).cost.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'costs_delete_failed', message: err?.message ?? String(err) }, { status: 500 })
  }
}
