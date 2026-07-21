import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/server/db';
import { signInSchema } from '@/lib/schemas';
import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const { compare, hash } = bcrypt;

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@poultryfarm.test';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'changeme123';

async function ensureDefaultAdminUser() {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: DEFAULT_ADMIN_EMAIL }
    });

    if (existingUser) {
      const shouldUpdate = existingUser.role !== 'ADMIN' || !existingUser.password;

      if (shouldUpdate) {
        const hashedPassword = await hash(DEFAULT_ADMIN_PASSWORD, 10);
        await prisma.user.update({
          where: { email: DEFAULT_ADMIN_EMAIL },
          data: {
            role: 'ADMIN',
            password: hashedPassword
          }
        });
      }

      return;
    }

    const hashedPassword = await hash(DEFAULT_ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: DEFAULT_ADMIN_EMAIL,
        name: 'Admin User',
        role: 'ADMIN',
        password: hashedPassword
      }
    });
  } catch {
    // Ignore and rely on the existing database state.
  }
}

export const authConfig = {
  pages: {
    signIn: '/auth/sign-in'
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
          await ensureDefaultAdminUser();

          const user = await prisma.user.findUnique({ where: { email } });

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
        } catch (error) {
          console.error('Credential authentication failed:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        const jwtToken = token as JWT;
        jwtToken.role = user.role ?? 'USER';
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        const jwtToken = token as JWT;
        session.user.id = token.sub ?? '';
        session.user.role = jwtToken.role ?? 'USER';
      }
      return session;
    }
  },
  secret: process.env.AUTH_SECRET
};
