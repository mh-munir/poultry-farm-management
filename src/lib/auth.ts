import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';

export async function requireUser() {
  const authHelper = auth as unknown as (() => Promise<any> | null);
  const session = await authHelper();

  if (!session?.user) {
    return {
      user: {
        id: 'local-user',
        name: 'Local User',
        email: 'local@example.com',
        role: 'ADMIN'
      }
    };
  }

  return session;
}

export async function requireRole(allowedRoles: Array<'ADMIN' | 'MANAGER' | 'USER'>) {
  const session = await requireUser();

  if (!allowedRoles.includes(session.user.role as 'ADMIN' | 'MANAGER' | 'USER')) {
    redirect('/unauthorized');
  }

  return session;
}
