import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const email = 'admin@poultryfarm.test';
const password = 'changeme123';

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  const hashed = await bcrypt.hash(password, 10);

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN', password: hashed }
    });
    console.log('updated');
  } else {
    await prisma.user.create({
      data: { email, name: 'Admin User', role: 'ADMIN', password: hashed }
    });
    console.log('created');
  }
} finally {
  await prisma.$disconnect();
}
