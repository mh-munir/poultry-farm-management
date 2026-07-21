import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  console.log('Connecting...');
  await prisma.$connect();
  console.log('Connected');
  const user = await prisma.user.findFirst();
  console.log('User query returned:', user ? 'found' : 'none');
} catch (error) {
  console.error('ERROR:', error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
