import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const created = await prisma.company.create({
    data: {
      name: `TEMP DELETE TEST ${Date.now()}`,
      companyType: 'FEED',
      isActive: true
    }
  });
  console.log('Created:', { id: created.id, name: created.name });

  const updated = await prisma.company.update({
    where: { id: created.id },
    data: { name: `${created.name} UPDATED`, isActive: false }
  });
  console.log('Updated:', { id: updated.id, name: updated.name, isActive: updated.isActive });

  const afterUpdate = await prisma.company.findUnique({ where: { id: created.id }, select: { id: true, name: true, isActive: true } });
  console.log('After update read:', afterUpdate);

  const deleted = await prisma.company.delete({ where: { id: created.id } });
  console.log('Deleted:', { id: deleted.id, name: deleted.name });

  const afterDelete = await prisma.company.findUnique({ where: { id: created.id }, select: { id: true } });
  console.log('After delete read:', afterDelete);
} catch (error) {
  console.error('ERROR', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
