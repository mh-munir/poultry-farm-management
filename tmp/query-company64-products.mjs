import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  try {
    const company64 = await prisma.company.findUnique({ where: { id: 64 }, select: { id: true, name: true } });
    const company70 = await prisma.company.findUnique({ where: { id: 70 }, select: { id: true, name: true } });
    const count64 = await prisma.product.count({ where: { companyId: 64 } });
    const count70 = await prisma.product.count({ where: { companyId: 70 } });
    const testMedicine = await prisma.product.findMany({ where: { name: { contains: 'test medicine', mode: 'insensitive' } }, orderBy: [{ id: 'asc' }], select: { id: true, code: true, name: true, unit: true, companyId: true, isActive: true, isArchived: true, productType: true } });
    const test = await prisma.product.findMany({ where: { name: { contains: 'test', mode: 'insensitive' } }, orderBy: [{ id: 'asc' }], select: { id: true, code: true, name: true, unit: true, companyId: true, isActive: true, isArchived: true, productType: true } });
    const medActive64 = await prisma.product.findMany({ where: { productType: 'MEDICINE', isActive: true, isArchived: false, companyId: 64 }, select: { id: true, name: true, unit: true, code: true, companyId: true } });
    console.log(JSON.stringify({ company64, company70, count64, count70, testMedicine, test: test.slice(0, 50), medActive64 }, null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
run();
