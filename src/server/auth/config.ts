import type { AuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { dbQuery, prisma } from '@/server/db';
import { signInSchema } from '@/lib/schemas';
import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const { compare } = bcrypt;

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

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role
          };
        } catch (err) {
          console.error('[auth] authorize: unexpected error', err);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log('[auth] signIn callback', {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        hasProfile: !!profile,
        hasEmail: !!email,
        hasCredentials: !!credentials
      });
      return true;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      const start = Date.now();
      const needsRefresh = token.sub && (!token.name || !token.role || token.image === undefined);
      if (needsRefresh) {
        console.log('[auth] jwt callback: token missing fields, will query DB', {
          hasName: !!token.name,
          hasRole: !!token.role,
          image: token.image
        });
      } else if (token.sub) {
        console.log('[auth] jwt callback: skipping DB refresh, token complete');
      }
      try {
        if (user) {
          const jwtToken = token as JWT & { image?: string | null };
          jwtToken.name = user.name ?? jwtToken.name;
          jwtToken.role = user.role ?? 'USER';
          if (typeof user.image !== 'undefined') {
            jwtToken.image = user.image ?? null;
          }
        } else if (needsRefresh) {
          const dbStart = Date.now();
          try {
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
            }
            console.log('[auth] jwt callback: DB query duration', Date.now() - dbStart, 'ms');
          } catch (err) {
            console.error('[auth] jwt callback: DB query failed', err);
          }
        }
      } catch (err) {
        console.error('[auth] jwt callback error', err);
      }
      console.log('[auth] jwt callback: total duration', Date.now() - start, 'ms');
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
