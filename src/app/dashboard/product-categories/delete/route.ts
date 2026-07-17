import { NextResponse } from 'next/server';
import { deleteCategory } from '@/features/product-categories/actions';

export async function POST(request: Request) {
  const formData = await request.formData();
  await deleteCategory(formData);
  return NextResponse.redirect(new URL('/dashboard/product-categories', request.url));
}
