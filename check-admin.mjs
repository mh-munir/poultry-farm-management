import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const email = 'admin@poultryfarm.test';
const password = 'changeme123';

try {
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user?.password ? await bcrypt.compare(password, user.password) : false;
  console.log(JSON.stringify({ found: Boolean(user), role: user?.role, valid }));
} finally {
  await prisma.$disconnect();
}
