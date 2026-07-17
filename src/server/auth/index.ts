import NextAuth from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/server/auth/config';

const nextAuthHandler = NextAuth(authConfig);

export const GET = nextAuthHandler.GET;
export const POST = nextAuthHandler.POST;
export const handlers = { GET, POST };

export async function auth() {
  return getServerSession(authConfig);
}

export async function signIn(..._args: unknown[]) {
  return { ok: true };
}

export async function signOut(..._args: unknown[]) {
  return { ok: true };
}

export async function getUserSession() {
  return null;
}
