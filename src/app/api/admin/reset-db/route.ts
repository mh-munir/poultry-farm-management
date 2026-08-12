import { NextResponse } from 'next/server';
import { resetDatabaseForTesting } from '@/features/admin/actions';

export async function POST() {
  // This endpoint exists only to support local test environments. Never expose a
  // destructive reset capability from a production deployment.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  try {
    const result = await resetDatabaseForTesting();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to reset database.' }, { status: 500 });
  }
}
