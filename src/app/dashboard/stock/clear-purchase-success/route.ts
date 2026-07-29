import { cookies } from 'next/headers';

export async function POST() {
  const cookiesStore = await cookies();
  cookiesStore.set({
    name: 'purchaseSuccess',
    value: '',
    path: '/dashboard',
    maxAge: 0,
    sameSite: 'lax'
  });

  return new Response(null, { status: 204 });
}
