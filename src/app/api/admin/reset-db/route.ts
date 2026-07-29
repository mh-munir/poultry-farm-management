import { NextResponse } from 'next/server';
import { resetDatabaseForTesting } from '@/features/admin/actions';

export async function POST() {
  try {
    const result = await resetDatabaseForTesting();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to reset database.' }, { status: 500 });
  }
}
