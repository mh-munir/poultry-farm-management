import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const nonNullCompany = await prisma.product.findMany({
      where: { companyId: { not: null } },
      orderBy: [{ companyId: 'asc' }, { id: 'asc' }],
      take: 200,
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        productType: true,
        companyId: true,
        defaultPurchasePrice: true,
        defaultSellingPrice: true,
        isActive: true,
        isArchived: true
      }
    });

    const productCompanyPairs = await prisma.transaction.findMany({
      where: { companyId: { not: null }, transactionType: 'PURCHASE' },
      select: {
        companyId: true,
        transactionItems: { select: { productId: true } }
      }
    });

    const productCompanyMap = new Map();
    for (const tx of productCompanyPairs) {
      const companyId = tx.companyId;
      for (const item of tx.transactionItems) {
        if (item.productId == null) continue;
        const existing = productCompanyMap.get(item.productId) ?? new Set();
        existing.add(companyId);
        productCompanyMap.set(item.productId, existing);
      }
    }

    const purchasedProductIdsByCompany = Array.from(productCompanyMap.keys());
    const purchasedProductsWithNoCompanyId = await prisma.product.findMany({
      where: { id: { in: purchasedProductIdsByCompany }, companyId: null },
      select: { id: true, name: true, code: true, productType: true, unit: true }
    });

    const mismatchedProductCompanyIds = [];
    for (const [productId, companies] of productCompanyMap.entries()) {
      const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, companyId: true, name: true } });
      if (product && product.companyId !== null && !companies.has(product.companyId)) {
        mismatchedProductCompanyIds.push({ productId, productCompanyId: product.companyId, transactionCompanyIds: Array.from(companies) });
      }
    }

    const productsWithMultipleCompanies = [];
    for (const [productId, companies] of productCompanyMap.entries()) {
      if (companies.size > 1) {
        productsWithMultipleCompanies.push({ productId, companyIds: Array.from(companies).sort((a, b) => a - b) });
      }
    }

    const prod90 = await prisma.product.findUnique({
      where: { id: 90 },
      include: {
        stockBalance: true,
        stockMovements: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, quantity: true, unitCost: true, transactionId: true, movementType: true, createdAt: true }
        },
        transactionItems: {
          include: {
            transaction: {
              select: {
                id: true,
                companyId: true,
                transactionType: true,
                invoiceNumber: true,
                transactionDate: true,
                totalAmount: true,
                paidAmount: true,
                dueAmount: true,
                partyId: true
              }
            }
          }
        }
      }
    });

    const txs90 = await prisma.transaction.findMany({
      where: { transactionItems: { some: { productId: 90 } } },
      orderBy: [{ transactionDate: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        companyId: true,
        transactionType: true,
        invoiceNumber: true,
        transactionDate: true,
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        partyId: true
      }
    });

    const medicineStockForCompany64 = await prisma.product.findMany({
      where: {
        isActive: true,
        isArchived: false,
        productType: 'MEDICINE',
        companyId: 64
      },
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        defaultPurchasePrice: true,
        defaultSellingPrice: true,
        stockBalance: { select: { quantityOnHand: true } }
      }
    });

    const sameName = await prisma.product.findMany({
      where: { name: { equals: 'test medicine', mode: 'insensitive' } },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        productType: true,
        companyId: true,
        defaultPurchasePrice: true,
        stockBalance: { select: { quantityOnHand: true } },
        isActive: true,
        isArchived: true
      }
    });

    const productTransactionCompanies = [];
    for (const [productId, companies] of productCompanyMap.entries()) {
      if (companies.size > 0) {
        productTransactionCompanies.push({ productId, companyIds: Array.from(companies).sort((a, b) => a - b) });
      }
    }

    const stockBalanceUniqueness = {
      isUniqueOnProductId: true,
      description: 'StockBalance has unique productId; no companyId present.'
    };

    console.log(JSON.stringify({
      nonNullCompanyProducts: nonNullCompany,
      productsReferencedByMultipleCompanies: productsWithMultipleCompanies,
      product90: prod90,
      transactionsForProduct90: txs90,
      sameNameProducts: sameName,
      stockBalanceUniqueness,
      productTransactionCompanies: productTransactionCompanies.slice(0, 200)
    }, null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('audit script start');
await run();
console.log('audit script done');
