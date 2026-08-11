import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    // Check products 90, 91, 92 specifically
    const specificProducts = await prisma.product.findMany({
      where: { id: { in: [90, 91, 92] } },
      select: {
        id: true, code: true, name: true, unit: true, companyId: true,
        productType: true, isActive: true, isArchived: true,
        defaultPurchasePrice: true, defaultSellingPrice: true,
        stockBalance: { select: { id: true, quantityOnHand: true, averageCost: true } }
      }
    });
    console.log('=== Products 90, 91, 92 ===');
    console.log(JSON.stringify(specificProducts.map(p => ({
      id: p.id, code: p.code, name: p.name, unit: p.unit, companyId: p.companyId,
      productType: p.productType, isActive: p.isActive, isArchived: p.isArchived,
      buyRate: p.defaultPurchasePrice?.toString(), saleRate: p.defaultSellingPrice?.toString(),
      stock: p.stockBalance?.quantityOnHand?.toString(), stockId: p.stockBalance?.id,
      averageCost: p.stockBalance?.averageCost?.toString()
    })), null, 2));

    // Check ALL products, not just medicine
    const allProducts = await prisma.product.findMany({
      where: { isActive: true, isArchived: false },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      select: {
        id: true, code: true, name: true, unit: true, companyId: true,
        productType: true,
        defaultPurchasePrice: true, defaultSellingPrice: true,
        stockBalance: { select: { quantityOnHand: true } }
      }
    });
    console.log('\n=== ALL active non-archived products ===');
    console.log('Total:', allProducts.length);
    console.log(JSON.stringify(allProducts.map(p => ({
      id: p.id, code: p.code, name: p.name, unit: p.unit, companyId: p.companyId,
      productType: p.productType,
      buyRate: p.defaultPurchasePrice?.toString(), saleRate: p.defaultSellingPrice?.toString(),
      stock: p.stockBalance?.quantityOnHand?.toString()
    })), null, 2));

    // Check for name duplicates across ALL products
    const nameGroups = new Map();
    for (const p of allProducts) {
      const key = p.name.toLowerCase();
      if (!nameGroups.has(key)) nameGroups.set(key, []);
      nameGroups.get(key).push(p);
    }
    console.log('\n=== Name groups with multiple variants ===');
    let found = false;
    for (const [name, group] of nameGroups) {
      if (group.length > 1) {
        found = true;
        console.log(`"${name}" has ${group.length} variants:`);
        group.forEach(p => console.log(`  id=${p.id} unit="${p.unit}" productType="${p.productType}" companyId=${p.companyId} stock=${p.stockBalance?.quantityOnHand?.toString()}`));
      }
    }
    if (!found) console.log('(none)');
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
