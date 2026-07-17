import { NextResponse } from 'next/server';
import { deleteParty } from '@/features/parties/actions';

export async function POST(request: Request) {
  const formData = await request.formData();
  await deleteParty(formData);
  return NextResponse.redirect(new URL('/dashboard/parties', request.url));
}
