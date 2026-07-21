import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { dbQuery, prisma } from '@/server/db';
import { signInSchema } from '@/lib/schemas';
import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const { compare, hash } = bcrypt;

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@poultryfarm.test';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'changeme123';

async function ensureDefaultAdminUser() {
  try {
    const existingUser = await dbQuery(
      prisma.user.findUnique({ where: { email: DEFAULT_ADMIN_EMAIL } }),
      20000
    );

    if (existingUser) {
      const shouldUpdate = existingUser.role !== 'ADMIN' || !existingUser.password;

      if (shouldUpdate) {
        const hashedPassword = await hash(DEFAULT_ADMIN_PASSWORD, 10);
        await dbQuery(
          prisma.user.update({
            where: { email: DEFAULT_ADMIN_EMAIL },
            data: {
              role: 'ADMIN',
              password: hashedPassword
            }
          }),
          20000
        );
      }

      return;
    }

    const hashedPassword = await hash(DEFAULT_ADMIN_PASSWORD, 10);
    await dbQuery(
      prisma.user.create({
        data: {
          email: DEFAULT_ADMIN_EMAIL,
          name: 'Admin User',
          role: 'ADMIN',
          password: hashedPassword
        }
      }),
      20000
    );
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
          console.log('❌ Sign in validation failed');
          return null;
        }

        const { email, password } = parsed.data;

        try {
          console.log('🔄 Ensuring default admin user...');
          await ensureDefaultAdminUser();

          console.log('🔍 Finding user:', email);
          const user = await dbQuery(prisma.user.findUnique({ where: { email } }), 30000);

          if (!user) {
            console.log('❌ User not found:', email);
            return null;
          }

          if (!user?.password) {
            console.log('❌ No password set for user:', email);
            return null;
          }

          console.log('🔐 Comparing passwords...');
          const isValid = await compare(password, user.password);
          if (!isValid) {
            console.log('❌ Password mismatch for user:', email);
            return null;
          }

          console.log('✅ Login successful for:', email);
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
