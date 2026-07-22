import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';

export interface AppSessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: 'ADMIN' | 'MANAGER' | 'USER' | string;
}

export interface AppSession {
  user: AppSessionUser;
}

export async function requireUser(): Promise<AppSession> {
  const session = (await auth()) as AppSession | null;

  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  return session ?? { user: { role: 'USER' } };
}

export async function requireRole(allowedRoles: Array<'ADMIN' | 'MANAGER' | 'USER'>) {
  const session = await requireUser();

  if (!allowedRoles.includes((session.user.role ?? 'USER') as 'ADMIN' | 'MANAGER' | 'USER')) {
    redirect('/unauthorized');
  }

  return session;
}
