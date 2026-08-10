import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  try {
    const meds = await prisma.product.findMany({
      where: { productType: 'MEDICINE' },
      select: { id: true, code: true, name: true, unit: true, companyId: true, defaultPurchasePrice: true, defaultSellingPrice: true },
      take: 100
    });
    const grouping = await prisma.product.groupBy({
      by: ['name', 'unit', 'companyId'],
      _count: { _all: true },
      orderBy: { _count: { _all: 'desc' } },
      take: 50
    });
    const unitOnlyGroup = await prisma.product.groupBy({
      by: ['unit'],
      _count: { _all: true },
      orderBy: { _count: { _all: 'desc' } }
    });
    const output = {
      meds,
      grouping,
      unitOnlyGroup
    };
    const fs = await import('fs');
    fs.writeFileSync('tmp/db_inspect_output.json', JSON.stringify(output, null, 2), 'utf8');
  } catch (error) {
    const fs = await import('fs');
    fs.writeFileSync('tmp/db_inspect_error.txt', String(error), 'utf8');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
