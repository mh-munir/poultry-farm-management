import { NextResponse } from 'next/server';
import { getProfitAnalytics } from '@/features/dashboard/actions';

function parseDateParam(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  const start = parseDateParam(startParam) ?? null;
  const end = parseDateParam(endParam) ?? null;

  if (!start || !end) {
    return NextResponse.json({ error: 'missing_date_range', message: 'Provide start and end ISO date strings.' }, { status: 400 });
  }

  try {
    const data = await getProfitAnalytics({ start, end });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'server_error', message: err?.message ?? String(err) }, { status: 500 });
  }
}
