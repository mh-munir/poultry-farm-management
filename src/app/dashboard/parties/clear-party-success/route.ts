import { cookies } from 'next/headers';

export async function POST() {
  const cookiesStore = await cookies();
  cookiesStore.set({
    name: 'partySuccess',
    value: '',
    path: '/dashboard/parties',
    maxAge: 0,
    sameSite: 'lax'
  });

  return new Response(null, { status: 204 });
}
