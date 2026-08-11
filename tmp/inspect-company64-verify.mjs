import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
const prisma = new PrismaClient();

async function run() {
  try {
    const companyId = 64;
    const prod90 = await prisma.product.findUnique({
      where: { id: 90 },
      include: {
        stockBalance: true,
        stockMovements: { orderBy: { createdAt: 'asc' } },
        transactionItems: { include: { transaction: true } }
      }
    });

    const company64Medicines = await prisma.product.findMany({
      where: {
        productType: 'MEDICINE',
        isActive: true,
        isArchived: false,
        companyId
      },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      include: {
        stockBalance: true,
        stockMovements: { orderBy: { createdAt: 'asc' }, take: 10 },
        transactionItems: { include: { transaction: true } }
      }
    });

    const purchaseTrackedNullCompany = await prisma.product.findMany({
      where: {
        productType: 'MEDICINE',
        isActive: true,
        isArchived: false,
        companyId: null,
        transactionItems: {
          some: {
            transaction: {
              companyId,
              transactionType: 'PURCHASE'
            }
          }
        }
      },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      include: { stockBalance: true }
    });

    const testMedicine = await prisma.product.findMany({
      where: {
        name: { contains: 'test medicine', mode: 'insensitive' }
      },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      include: { stockBalance: true, stockMovements: { orderBy: { createdAt: 'asc' }, take: 5 } }
    });

    const raw = {
      prod90,
      company64Medicines: company64Medicines.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        companyId: p.companyId,
        isActive: p.isActive,
        isArchived: p.isArchived,
        stockBalance: p.stockBalance,
        stockMovements: p.stockMovements.map((m) => ({ id: m.id, movementType: m.movementType, quantity: m.quantity.toString(), unitCost: m.unitCost?.toString(), createdAt: m.createdAt })),
        transactionCompanyIds: Array.from(new Set(p.transactionItems.map((item) => item.transaction.companyId))).sort((a, b) => (a ?? 0) - (b ?? 0))
      })),
      purchaseTrackedNullCompany: purchaseTrackedNullCompany.map((p) => ({ id: p.id, code: p.code, name: p.name, unit: p.unit, transactionCompanyIds: Array.from(new Set(p.transactionItems?.map((item) => item.transaction.companyId))).sort((a, b) => (a ?? 0) - (b ?? 0)) })),
      testMedicine: testMedicine.map((p) => ({ id: p.id, code: p.code, name: p.name, unit: p.unit, companyId: p.companyId, isActive: p.isActive, isArchived: p.isArchived, stockBalance: p.stockBalance }))
    };

    writeFileSync('tmp/inspect-company64-verify-output.json', JSON.stringify(raw, null, 2), 'utf8');
  } catch (error) {
    writeFileSync('tmp/inspect-company64-verify-output-error.txt', String(error), 'utf8');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

await run();
