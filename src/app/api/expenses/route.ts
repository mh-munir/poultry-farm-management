import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { requireUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const createSchema = z.object({ amount: z.coerce.number(), description: z.string().optional(), date: z.string().optional() })

export async function GET(request: Request) {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url);
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  try {
    const where: any = {}
    if (from || to) where.expenseDate = {}
    if (from) where.expenseDate.gte = new Date(from)
    if (to) where.expenseDate.lte = new Date(to)

    const expenses = await (prisma as any).expense.findMany({ where, orderBy: { expenseDate: 'desc' } })
    return NextResponse.json(expenses)
  } catch (err: any) {
    return NextResponse.json({ error: 'expenses_unavailable', message: err?.message ?? String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireUser()
  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const { amount, description, date } = parsed.data

  try {
    const created = await (prisma as any).expense.create({
      data: {
        amount,
        description: description ?? null,
        expenseDate: date ? new Date(date) : undefined,
        createdById: session.user.id ?? null
      }
    })

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/expenses');
    return NextResponse.json(created)
  } catch (err: any) {
    return NextResponse.json({ error: 'expenses_create_failed', message: err?.message ?? String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url);
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  try {
    await (prisma as any).expense.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'expenses_delete_failed', message: err?.message ?? String(err) }, { status: 500 })
  }
}