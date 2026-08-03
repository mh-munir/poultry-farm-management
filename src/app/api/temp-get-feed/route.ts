import { getStockItemsByType } from '@/features/stock/actions';
import { NextResponse } from 'next/server';

export async function GET() {
  const items = await getStockItemsByType('FEED');
  return NextResponse.json(items);
}
