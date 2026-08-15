import { NextResponse } from 'next/server';
import { EMPTY_PROFIT_ANALYTICS, getProfitAnalytics } from '@/features/dashboard/actions';
import { auth } from '@/server/auth';

function parseDateParam(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  const start = parseDateParam(startParam) ?? null;
  const end = parseDateParam(endParam) ?? null;

  if ((startParam && !start) || (endParam && !end)) {
    return NextResponse.json({ error: 'invalid_date_range', message: 'Provide valid ISO date strings.' }, { status: 400 });
  }

  if ((start && !end) || (!start && end)) {
    return NextResponse.json({ error: 'missing_date_range', message: 'Provide start and end ISO date strings.' }, { status: 400 });
  }

  try {
    const data = await getProfitAnalytics({ ...(start && end ? { start, end } : {}) });
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Unable to load profit analytics', err);
    return NextResponse.json({ ...EMPTY_PROFIT_ANALYTICS, unavailable: true });
  }
}
