
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to the database...');
  await prisma.$connect();
  console.log('Connected to the database.');
}

main().finally(async () => {
  await prisma.$disconnect();
});
