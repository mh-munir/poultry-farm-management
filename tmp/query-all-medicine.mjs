import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const products = await prisma.product.findMany({
      where: { productType: 'MEDICINE', isActive: true, isArchived: false },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        companyId: true,
        defaultPurchasePrice: true,
        defaultSellingPrice: true,
        stockBalance: { select: { quantityOnHand: true } }
      }
    });

    console.log('Total medicine products:', products.length);
    console.log(JSON.stringify(products.map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      unit: p.unit,
      companyId: p.companyId,
      buyRate: p.defaultPurchasePrice?.toString(),
      saleRate: p.defaultSellingPrice?.toString(),
      stock: p.stockBalance?.quantityOnHand?.toString()
    })), null, 2));

    // Check for name duplicates
    const nameGroups = new Map();
    for (const p of products) {
      const key = p.name.toLowerCase();
      if (!nameGroups.has(key)) nameGroups.set(key, []);
      nameGroups.get(key).push(p);
    }
    console.log('\n--- Name groups with multiple variants ---');
    for (const [name, group] of nameGroups) {
      if (group.length > 1) {
        console.log(`"${name}" has ${group.length} variants:`);
        group.forEach(p => console.log(`  id=${p.id} unit="${p.unit}" stock=${p.stockBalance?.quantityOnHand?.toString()}`));
      }
    }
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
