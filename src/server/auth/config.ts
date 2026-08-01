import type { AuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { dbQuery, prisma } from '@/server/db';
import { signInSchema } from '@/lib/schemas';
import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const { compare } = bcrypt;

const jwtUserCache = new Map<string, { name?: string | null; role?: string | null; image?: string | null; expiry: number }>();
const JWT_USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const authConfig: AuthOptions = {
  pages: {
    signIn: '/auth/sign-in'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);

        if (!parsed.success) {
          console.error('[auth] authorize: schema validation failed', {
            issues: parsed.error.issues,
            received: credentials
          });
          return null;
        }

        const { email, password } = parsed.data;

        try {
          const user = await dbQuery(
            prisma.user.findUnique({
              where: { email },
              select: { id: true, name: true, email: true, password: true, role: true, image: true }
            }),
            'Auth User Lookup by Email',
            'User',
            'findUnique',
            30000,
            null
          );

          if (!user) {
            console.error('[auth] authorize: user not found', { email });
            return null;
          }

          if (!user?.password) {
            console.error('[auth] authorize: user has no password', { email, userId: user.id });
            return null;
          }

          const isValid = await compare(password, user.password);
          if (!isValid) {
            console.error('[auth] authorize: invalid password', { email, userId: user.id });
            return null;
          }

          const result = {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role
          };

          // Cache user fields to reduce immediate jwt refresh DB hits
          try {
            jwtUserCache.set(user.id, { name: user.name ?? null, role: user.role ?? null, image: user.image ?? null, expiry: Date.now() + JWT_USER_CACHE_TTL });
          } catch {}

          return result;
        } catch (err) {
          console.error('[auth] authorize: unexpected error', err);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      return true;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      const needsRefresh = token.sub && (!token.name || !token.role || token.image === undefined);
      if (user) {
        const jwtToken = token as JWT & { image?: string | null };
        jwtToken.name = user.name ?? jwtToken.name;
        jwtToken.role = user.role ?? 'USER';
        if (typeof user.image !== 'undefined') {
          jwtToken.image = user.image ?? null;
        }
      } else if (needsRefresh) {
        try {
          // Try in-memory cache first to avoid repeated DB hits for the same user
          const cacheEntry = token.sub ? jwtUserCache.get(token.sub) : undefined;
          const now = Date.now();
          if (cacheEntry && cacheEntry.expiry > now) {
            const jwtToken = token as JWT & { image?: string | null };
            jwtToken.name = cacheEntry.name ?? jwtToken.name;
            jwtToken.role = cacheEntry.role ?? jwtToken.role;
            jwtToken.image = cacheEntry.image ?? jwtToken.image ?? null;
          } else {
            const refreshedUser = await dbQuery(
              prisma.user.findUnique({
                where: { id: token.sub },
                select: { name: true, role: true, image: true }
              }),
              'Auth User Refresh by Token',
              'User',
              'findUnique',
              20000,
              null
            );

            if (refreshedUser) {
              const jwtToken = token as JWT & { image?: string | null };
              jwtToken.name = refreshedUser.name ?? jwtToken.name;
              jwtToken.role = refreshedUser.role ?? jwtToken.role;
              jwtToken.image = refreshedUser.image ?? null;

              if (token.sub) {
                jwtUserCache.set(token.sub, {
                  name: refreshedUser.name ?? null,
                  role: refreshedUser.role ?? null,
                  image: refreshedUser.image ?? null,
                  expiry: Date.now() + JWT_USER_CACHE_TTL
                });
              }
            }
          }
        } catch (err) {
          console.error('[auth] jwt callback: DB query failed', err);
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      try {
        if (session.user) {
          const jwtToken = token as JWT & { image?: string | null };
          session.user.id = token.sub ?? '';
          session.user.name = jwtToken.name ?? session.user.name ?? null;
          session.user.role = jwtToken.role ?? 'USER';
          session.user.image = jwtToken.image ?? session.user.image ?? null;
        }
        return session;
      } catch (err) {
        console.error('[auth] session callback error', err);
        return session;
      }
    }
  },
  secret: process.env.AUTH_SECRET
};
