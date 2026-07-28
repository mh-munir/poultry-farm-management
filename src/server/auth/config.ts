import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { dbQuery, prisma } from '@/server/db';
import { signInSchema } from '@/lib/schemas';
import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const { compare } = bcrypt;

export const authConfig = {
  pages: {
    signIn: '/auth/sign-in'
  },
  session: {
    maxAge: 900
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
          return null;
        }

        const { email, password } = parsed.data;

        try {
          const user = await dbQuery(
            prisma.user.findUnique({
              where: { email },
              select: { id: true, name: true, email: true, password: true, role: true, image: true }
            }),
            30000,
            null
          );

          if (!user) {
            return null;
          }

          if (!user?.password) {
            return null;
          }

          const isValid = await compare(password, user.password);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role
          };
        } catch {
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        const jwtToken = token as JWT & { image?: string | null };
        jwtToken.role = user.role ?? 'USER';
        if (typeof user.image !== 'undefined') {
          jwtToken.image = user.image ?? null;
        }
      } else if (token.sub) {
        try {
          const refreshedUser = await dbQuery(
            prisma.user.findUnique({
              where: { id: token.sub },
              select: { name: true, role: true, image: true }
            }),
            20000,
            null
          );

          if (refreshedUser) {
            const jwtToken = token as JWT & { image?: string | null };
            jwtToken.name = refreshedUser.name ?? jwtToken.name;
            jwtToken.role = refreshedUser.role ?? jwtToken.role;
            jwtToken.image = refreshedUser.image ?? null;
          }
        } catch {
          // Ignore refresh failures and keep the existing token data.
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        const jwtToken = token as JWT & { image?: string | null };
        session.user.id = token.sub ?? '';
        session.user.name = jwtToken.name ?? session.user.name ?? null;
        session.user.role = jwtToken.role ?? 'USER';
        session.user.image = jwtToken.image ?? session.user.image ?? null;
      }
      return session;
    }
  },
  secret: process.env.AUTH_SECRET
};
