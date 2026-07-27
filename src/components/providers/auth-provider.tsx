"use client";

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { InactivityTimer } from '@/components/auth/inactivity-timer';

export function AuthProvider({
  children,
  session
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <InactivityTimer />
      {children}
    </SessionProvider>
  );
}
