import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/server/db';
import { signInSchema } from '@/lib/schemas';
import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

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
