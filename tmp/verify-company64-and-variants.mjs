import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function formatDecimal(value) {
  return value == null ? null : value.toString();
}

async function run() {
  try {
    const companyId = 64;
    const otherCompanyId = 70;

    const medicineProducts = await prisma.product.findMany({
      where: {
        productType: 'MEDICINE',
        name: { contains: 'test medicine', mode: 'insensitive' }
      },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      include: {
        stockBalance: true,
        stockMovements: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            transactionId: true,
            movementType: true,
            quantity: true,
            unitCost: true,
            createdAt: true
          }
        },
        transactionItems: {
          include: {
            transaction: {
              select: {
                id: true,
                companyId: true,
                transactionType: true,
                invoiceNumber: true,
                transactionDate: true
              }
            }
          }
        }
      }
    });

    const company64Medicine = await prisma.product.findMany({
      where: {
        isActive: true,
        isArchived: false,
        productType: 'MEDICINE',
        OR: [
          { companyId: companyId },
          {
            transactionItems: {
              some: {
                transaction: {
                  companyId: companyId,
                  transactionType: 'PURCHASE'
                }
              }
            }
          }
        ]
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
        stockBalance: { select: { id: true, quantityOnHand: true, averageCost: true } },
        transactionItems: {
          select: {
            productId: true,
            transaction: {
              select: { id: true, companyId: true, transactionType: true, invoiceNumber: true, transactionDate: true }
            }
          }
        }
      }
    });

    const company64PurchaseProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        isArchived: false,
        productType: 'MEDICINE',
        companyId: null,
        transactionItems: {
          some: {
            transaction: {
              companyId: companyId,
              transactionType: 'PURCHASE'
            }
          }
        }
      },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        companyId: true,
        stockBalance: { select: { id: true, quantityOnHand: true, averageCost: true } },
        transactionItems: {
          select: {
            productId: true,
            transaction: {
              select: { id: true, companyId: true, transactionType: true, invoiceNumber: true, transactionDate: true }
            }
          }
        }
      }
    });

    const company70PurchaseProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        isArchived: false,
        productType: 'MEDICINE',
        companyId: null,
        transactionItems: {
          some: {
            transaction: {
              companyId: otherCompanyId,
              transactionType: 'PURCHASE'
            }
          }
        }
      },
      orderBy: [{ name: 'asc' }, { unit: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        companyId: true,
        stockBalance: { select: { id: true, quantityOnHand: true, averageCost: true } },
        transactionItems: {
          select: {
            productId: true,
            transaction: {
              select: { id: true, companyId: true, transactionType: true, invoiceNumber: true, transactionDate: true }
            }
          }
        }
      }
    });

    const allMedicineProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        isArchived: false,
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
        stockBalance: { select: { id: true, quantityOnHand: true, averageCost: true } },
        stockMovements: {
          where: { movementType: 'PURCHASE' },
          orderBy: { createdAt: 'asc' },
          select: { id: true, transactionId: true, quantity: true, unitCost: true, movementType: true, createdAt: true }
        },
        transactionItems: {
          select: {
            transaction: {
              select: { id: true, companyId: true, transactionType: true, invoiceNumber: true, transactionDate: true }
            }
          }
        }
      }
    });

    const productsWithPurchaseCompanies = [];
    for (const product of allMedicineProducts) {
      const companies = new Set();
      for (const item of product.transactionItems) {
        if (item.transaction.companyId != null && item.transaction.transactionType === 'PURCHASE') {
          companies.add(item.transaction.companyId);
        }
      }
      if (companies.size > 0) {
        productsWithPurchaseCompanies.push({
          id: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          companyId: product.companyId,
          purchaseCompanyIds: Array.from(companies).sort((a, b) => a - b),
          stockBalance: product.stockBalance,
          purchaseMovements: product.stockMovements
        });
      }
    }

    const company64OnlyFallback = [];
    for (const product of productsWithPurchaseCompanies) {
      if (product.companyId == null && product.purchaseCompanyIds.length === 1 && product.purchaseCompanyIds[0] === companyId) {
        company64OnlyFallback.push(product);
      }
    }

    const company70OnlyFallback = [];
    for (const product of productsWithPurchaseCompanies) {
      if (product.companyId == null && product.purchaseCompanyIds.length === 1 && product.purchaseCompanyIds[0] === otherCompanyId) {
        company70OnlyFallback.push(product);
      }
    }

    const company64And70Products = productsWithPurchaseCompanies.filter(
      (p) => p.purchaseCompanyIds.includes(companyId) && p.purchaseCompanyIds.includes(otherCompanyId)
    );

    const purchasesForProduct90 = await prisma.transaction.findMany({
      where: {
        transactionItems: { some: { productId: 90 } },
        transactionType: 'PURCHASE'
      },
      orderBy: [{ transactionDate: 'asc' }, { id: 'asc' }],
      select: { id: true, companyId: true, invoiceNumber: true, transactionDate: true }
    });

    const salesForProduct90 = await prisma.transaction.findMany({
      where: {
        transactionItems: { some: { productId: 90 } },
        transactionType: 'SALE'
      },
      orderBy: [{ transactionDate: 'asc' }, { id: 'asc' }],
      select: { id: true, companyId: true, invoiceNumber: true, transactionDate: true }
    });

    const variantProducts = await prisma.product.findMany({
      where: {
        name: { contains: 'test medicine', mode: 'insensitive' },
        productType: 'MEDICINE'
      },
      orderBy: [{ unit: 'asc' }, { id: 'asc' }],
      include: {
        stockBalance: true,
        stockMovements: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, transactionId: true, unitCost: true, quantity: true, movementType: true, createdAt: true }
        },
        transactionItems: {
          select: {
            quantity: true,
            unitPrice: true,
            description: true,
            transaction: { select: { id: true, companyId: true, transactionType: true, invoiceNumber: true, transactionDate: true } }
          }
        }
      }
    });

    console.log(JSON.stringify({
      medicineProductsMatchingTestMedicine: medicineProducts.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        companyId: p.companyId,
        defaultPurchasePrice: formatDecimal(p.defaultPurchasePrice),
        defaultSellingPrice: formatDecimal(p.defaultSellingPrice),
        stockBalance: p.stockBalance ? { id: p.stockBalance.id, quantityOnHand: formatDecimal(p.stockBalance.quantityOnHand), averageCost: formatDecimal(p.stockBalance.averageCost) } : null,
        stockMovements: p.stockMovements.map((m) => ({ id: m.id, transactionId: m.transactionId, quantity: formatDecimal(m.quantity), unitCost: formatDecimal(m.unitCost), movementType: m.movementType, createdAt: m.createdAt })),
        transactionCompanies: Array.from(new Set(p.transactionItems.map((item) => item.transaction.companyId))).sort((a, b) => (a ?? 0) - (b ?? 0))
      })),
      company64MedicineCandidates: company64Medicine,
      fallbackProductsCompany64: company64OnlyFallback,
      fallbackProductsCompany70: company70OnlyFallback,
      crossCompanyProducts: company64And70Products,
      purchasesForProduct90,
      salesForProduct90,
      variantProducts: variantProducts.map((p) => ({
        id: p.id,
        code: p.code,
        unit: p.unit,
        companyId: p.companyId,
        defaultPurchasePrice: formatDecimal(p.defaultPurchasePrice),
        defaultSellingPrice: formatDecimal(p.defaultSellingPrice),
        stockBalance: p.stockBalance ? { id: p.stockBalance.id, quantityOnHand: formatDecimal(p.stockBalance.quantityOnHand), averageCost: formatDecimal(p.stockBalance.averageCost) } : null,
        stockMovements: p.stockMovements.map((m) => ({ id: m.id, transactionId: m.transactionId, quantity: formatDecimal(m.quantity), unitCost: formatDecimal(m.unitCost), movementType: m.movementType, createdAt: m.createdAt })),
        transactionItems: p.transactionItems.map((item) => ({
          quantity: formatDecimal(item.quantity),
          unitPrice: formatDecimal(item.unitPrice),
          description: item.description,
          transaction: item.transaction
        }))
      }))
    }, null, 2));
  } catch (error) {
    console.error('ERROR', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
