import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const party = await prisma.party.findUnique({ where: { id: 1 }, select: { id: true, name: true, isActive: true } });
  console.log(JSON.stringify({ party }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
