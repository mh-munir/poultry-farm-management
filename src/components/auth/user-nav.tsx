'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export function UserNav() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!session?.user) {
    return (
      <Link href="/auth/sign-in" className="hover:text-foreground">
        Sign in
      </Link>
    );
  }

  const role = session.user.role ?? 'USER';

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/dashboard" className="hover:text-foreground">
        Dashboard
      </Link>
      {role === 'ADMIN' ? (
        <Link href="/admin" className="hover:text-foreground">
          Admin
        </Link>
      ) : null}
      {role === 'ADMIN' || role === 'MANAGER' ? (
        <Link href="/staff" className="hover:text-foreground">
          Staff
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/auth/sign-in' })}
        className="rounded-md border px-3 py-1.5 hover:bg-accent"
      >
        Logout
      </button>
    </div>
  );
}
