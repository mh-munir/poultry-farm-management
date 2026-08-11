import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const searchTerm = 'test medicine';

    // 1. Search for "test medicine" (case-insensitive)
    const testMedicineProducts = await prisma.product.findMany({
      where: {
        name: { contains: searchTerm, mode: 'insensitive' },
        productType: 'MEDICINE'
      },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        companyId: true,
        defaultPurchasePrice: true,
        defaultSellingPrice: true,
        isActive: true,
        isArchived: true,
        stockBalance: { select: { id: true, quantityOnHand: true, averageCost: true } }
      }
    });

    console.log('=== Records matching "test medicine" (case-insensitive) ===');
    console.log(JSON.stringify(testMedicineProducts.map(p => ({
      "Product ID": p.id,
      "Medicine Name": p.name,
      "Gram/Weight (unit)": p.unit,
      "Company ID": p.companyId,
      "Stock Quantity": p.stockBalance?.quantityOnHand?.toString(),
      "Buy Rate": p.defaultPurchasePrice?.toString(),
      "Sale Rate": p.defaultSellingPrice?.toString(),
      "isActive": p.isActive,
      "isArchived": p.isArchived,
      "StockBalance ID": p.stockBalance?.id
    })), null, 2));
    console.log('Count:', testMedicineProducts.length);

    // 2. Also search for "test" broadly
    const allTestProducts = await prisma.product.findMany({
      where: {
        name: { contains: 'test', mode: 'insensitive' }
      },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      select: {
        id: true, code: true, name: true, unit: true, companyId: true,
        productType: true, defaultPurchasePrice: true, defaultSellingPrice: true,
        isActive: true, isArchived: true,
        stockBalance: { select: { quantityOnHand: true } }
      }
    });
    console.log('\n=== All products matching "test" (any type) ===');
    console.log(JSON.stringify(allTestProducts.map(p => ({
      "Product ID": p.id,
      "Name": p.name,
      "Gram/Weight (unit)": p.unit,
      "Company ID": p.companyId,
      "Product Type": p.productType,
      "Stock Quantity": p.stockBalance?.quantityOnHand?.toString(),
      "Buy Rate": p.defaultPurchasePrice?.toString(),
      "Sale Rate": p.defaultSellingPrice?.toString(),
      "isActive": p.isActive,
      "isArchived": p.isArchived
    })), null, 2));
    console.log('Count:', allTestProducts.length);

    // 3. Check for ANY name duplicates across all medicine products
    const allMedicine = await prisma.product.findMany({
      where: { productType: 'MEDICINE', isActive: true, isArchived: false },
      select: { id: true, name: true, unit: true, companyId: true }
    });
    const nameCount = new Map();
    for (const p of allMedicine) {
      const key = p.name.toLowerCase();
      if (!nameCount.has(key)) nameCount.set(key, []);
      nameCount.get(key).push(p);
    }
    console.log('\n=== Medicine name groups ===');
    for (const [name, group] of nameCount) {
      console.log(`"${name}": ${group.length} variant(s) - ${group.map(p => `id=${p.id} unit="${p.unit}" companyId=${p.companyId}`).join('; ')}`);
    }
    console.log('Total medicine products:', allMedicine.length);
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
