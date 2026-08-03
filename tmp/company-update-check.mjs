import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const id = 15;
  console.log('Before:', await prisma.company.findUnique({ where: { id }, select: { id: true, name: true, updatedAt: true } }));
  const updated = await prisma.company.update({ where: { id }, data: { name: 'Transcom Distribution Company LTD EDITED' } });
  console.log('Updated:', { id: updated.id, name: updated.name, updatedAt: updated.updatedAt });
  const after = await prisma.company.findUnique({ where: { id }, select: { id: true, name: true, updatedAt: true } });
  console.log('After:', after);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
