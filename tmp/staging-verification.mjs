import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const suffix = `${Date.now()}`;

async function main() {
  const categoryName = `STAGING-CAT-${suffix}`;
  const companyName = `STAGING-COMPANY-${suffix}`;
  const partyName = `STAGING-PARTY-${suffix}`;
  const productName = `STAGING-PRODUCT-${suffix}`;
  const productCode = `STG-${suffix}`;

  const category = await prisma.productCategory.create({
    data: {
      name: categoryName,
      slug: `staging-cat-${suffix}`,
      description: 'Temporary staging verification category',
      isActive: true
    }
  });

  const company = await prisma.company.create({
    data: {
      name: companyName,
      companyType: 'FEED',
      isActive: true,
      address: 'Staging verification'
    }
  });

  const party = await prisma.party.create({
    data: {
      name: partyName,
      phone: `+1555${suffix.slice(-8)}`,
      partyType: 'BOTH',
      openingBalance: new Prisma.Decimal(10000),
      openingBalanceType: 'CUSTOMER_DUE',
      openingBalanceDescription: 'Staging opening balance verification'
    }
  });

  const product = await prisma.product.create({
    data: {
      code: productCode,
      name: productName,
      productType: 'FEED',
      unit: 'bag',
      categoryId: category.id,
      companyId: company.id,
      defaultPurchasePrice: new Prisma.Decimal(1000),
      defaultSellingPrice: new Prisma.Decimal(1200),
      isActive: true,
      stockBalance: {
        create: {
          quantityOnHand: new Prisma.Decimal(0),
          reservedQuantity: new Prisma.Decimal(0),
          averageCost: new Prisma.Decimal(1000)
        }
      }
    }
  });

  const openingBalance = new Prisma.Decimal(10000);
  const purchaseAmount = new Prisma.Decimal(210000);
  const paymentAmount = new Prisma.Decimal(200000);
  const amountPayable = openingBalance.plus(purchaseAmount).minus(paymentAmount);

  const purchaseTransaction = await prisma.transaction.create({
    data: {
      transactionType: 'PURCHASE',
      companyId: company.id,
      transactionDate: new Date(),
      invoiceNumber: `STG-PUR-${suffix}`,
      status: 'COMPLETED',
      subtotal: purchaseAmount,
      discount: new Prisma.Decimal(0),
      tax: new Prisma.Decimal(0),
      totalAmount: purchaseAmount,
      paidAmount: paymentAmount,
      dueAmount: purchaseAmount.minus(paymentAmount),
      notes: 'Staging purchase verification',
      transactionItems: {
        create: {
          productId: product.id,
          quantity: new Prisma.Decimal(10),
          unitPrice: new Prisma.Decimal(21000),
          lineTotal: purchaseAmount,
          taxAmount: new Prisma.Decimal(0),
          description: 'Staging purchase item'
        }
      }
    }
  });

  await prisma.stockMovement.create({
    data: {
      productId: product.id,
      transactionId: purchaseTransaction.id,
      movementType: 'PURCHASE',
      quantity: new Prisma.Decimal(10),
      unitCost: new Prisma.Decimal(21000),
      notes: 'Staging stock verification'
    }
  });

  await prisma.stockBalance.update({
    where: { productId: product.id },
    data: { quantityOnHand: new Prisma.Decimal(10), averageCost: new Prisma.Decimal(21000) }
  });

  await prisma.payment.create({
    data: {
      companyId: company.id,
      paymentDate: new Date(),
      paymentMethod: 'CASH',
      amount: paymentAmount,
      referenceNumber: `STG-PAY-${suffix}`,
      status: 'COMPLETED',
      notes: 'Staging payment verification'
    }
  });

  await prisma.ledgerEntry.createMany({
    data: [
      {
        companyId: company.id,
        entryType: 'OPENING_BALANCE',
        amount: openingBalance,
        runningBalance: openingBalance,
        description: 'Opening balance verification',
        referenceNumber: `STG-OPEN-${suffix}`
      },
      {
        companyId: company.id,
        transactionId: purchaseTransaction.id,
        entryType: 'PURCHASE',
        amount: purchaseAmount,
        runningBalance: openingBalance.plus(purchaseAmount),
        description: 'Purchase verification',
        referenceNumber: purchaseTransaction.invoiceNumber
      },
      {
        companyId: company.id,
        transactionId: purchaseTransaction.id,
        entryType: 'PAYMENT_PAID',
        amount: paymentAmount.negated(),
        runningBalance: amountPayable,
        description: 'Payment verification',
        referenceNumber: `STG-PAY-${suffix}`
      }
    ]
  });

  const orphanTransactions = await prisma.$queryRawUnsafe(`SELECT t.id FROM public."Transaction" t LEFT JOIN public."Company" c ON c.id = t."companyId" WHERE t."companyId" IS NOT NULL AND c.id IS NULL;`);
  const duplicateStockBalances = await prisma.$queryRawUnsafe(`SELECT "productId", COUNT(*) FROM public."StockBalance" GROUP BY "productId" HAVING COUNT(*) > 1;`);
  const duplicateLedgerEntries = await prisma.$queryRawUnsafe(`SELECT "referenceNumber", COUNT(*) FROM public."LedgerEntry" WHERE "referenceNumber" IS NOT NULL GROUP BY "referenceNumber" HAVING COUNT(*) > 1;`);
  const duplicatePayments = await prisma.$queryRawUnsafe(`SELECT "referenceNumber", COUNT(*) FROM public."Payment" WHERE "referenceNumber" IS NOT NULL GROUP BY "referenceNumber" HAVING COUNT(*) > 1;`);

  const createdStock = await prisma.stockBalance.findUnique({ where: { productId: product.id } });
  const createdLedgerEntries = await prisma.ledgerEntry.findMany({ where: { companyId: company.id }, orderBy: [{ entryDate: 'asc' }, { id: 'asc' }] });

  const result = {
    companyId: company.id,
    partyId: party.id,
    categoryId: category.id,
    productId: product.id,
    openingBalance: openingBalance.toString(),
    purchaseAmount: purchaseAmount.toString(),
    paymentAmount: paymentAmount.toString(),
    amountPayable: amountPayable.toString(),
    stockOnHand: createdStock?.quantityOnHand?.toString() ?? null,
    ledgerEntries: createdLedgerEntries.map((entry) => ({ id: entry.id, type: entry.entryType, amount: entry.amount.toString(), runningBalance: entry.runningBalance.toString() })),
    orphanTransactions,
    duplicateStockBalances,
    duplicateLedgerEntries,
    duplicatePayments
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
