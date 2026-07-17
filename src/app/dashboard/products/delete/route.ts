import { NextResponse } from 'next/server';
import { deleteProduct } from '@/features/products/actions';

export async function POST(request: Request) {
  const formData = await request.formData();
  await deleteProduct(formData);
  return NextResponse.redirect(new URL('/dashboard/products', request.url));
}
