import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const tx = await prisma.transaction.findMany({ orderBy: { id: 'desc' }, take: 8, select: { id: true, invoiceNumber: true } });
    console.log(JSON.stringify(tx, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
