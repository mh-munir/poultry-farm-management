import NextAuth from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/server/auth/config';

const handler = NextAuth(authConfig);

export const handlers = {
  GET: handler,
  POST: handler
};

export async function auth() {
  return getServerSession(authConfig);
}

export async function getUserSession() {
  return auth();
}

export async function signIn(..._args: unknown[]) {
  throw new Error('Server-side signIn is not supported. Use next-auth/react signIn on the client.');
}

export async function signOut(..._args: unknown[]) {
  throw new Error('Server-side signOut is not supported. Use next-auth/react signOut on the client.');
}
