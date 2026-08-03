import { Prisma } from '@prisma/client';
import { prisma } from '../src/server/db/index.ts';

function generateTestInvoiceNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
  return `TEST-PUR-${datePart}-${randomPart}`;
}

async function run() {
  console.log('Verifying purchase transaction flow...');

  const company = await prisma.company.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
  const product = await prisma.product.findFirst({ where: { productType: 'FEED' }, orderBy: { id: 'asc' } });

  if (!company) {
    throw new Error('No active company found in database.');
  }

  if (!product) {
    throw new Error('No FEED product found in database.');
  }

  const invoiceNumber = generateTestInvoiceNumber();
  const subtotal = 1200;
  const discount = 0;
  const totalAmount = subtotal - discount;
  const paymentAmount = 0;
  const dueAmount = totalAmount - paymentAmount;
  const status = dueAmount > 0 ? 'PENDING' : 'COMPLETED';
  const transactionDate = new Date();

  console.log('Using company:', { id: company.id, name: company.name });
  console.log('Using product:', { id: product.id, name: product.name, type: product.productType });

  const purchaseId = await prisma.$transaction(async (tx) => {
    const purchase = await tx.transaction.create({
      data: {
        transactionType: 'PURCHASE',
        companyId: company.id,
        transactionDate,
        invoiceNumber,
        status,
        subtotal: new Prisma.Decimal(subtotal),
        discount: new Prisma.Decimal(discount),
        tax: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(totalAmount),
        paidAmount: new Prisma.Decimal(paymentAmount),
        dueAmount: new Prisma.Decimal(dueAmount),
        dueDate: null,
        referenceNumber: 'TEST-VERIFY',
        notes: 'Temporary verification transaction',
        transactionItems: {
          createMany: {
            data: [
              {
                productId: product.id,
                quantity: new Prisma.Decimal(10),
                unitPrice: new Prisma.Decimal(120),
                lineTotal: new Prisma.Decimal(1200),
                taxAmount: new Prisma.Decimal(0),
                description: 'Verify purchase transaction script'
              }
            ]
          }
        }
      }
    });

    const lastLedger = await tx.ledgerEntry.findFirst({
      where: { companyId: company.id },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
    });
    const previousBalance = new Prisma.Decimal(lastLedger?.runningBalance ?? 0);
    const purchaseBalance = previousBalance.plus(new Prisma.Decimal(totalAmount));

    await tx.ledgerEntry.create({
      data: {
        companyId: company.id,
        transactionId: purchase.id,
        entryType: 'PURCHASE',
        amount: new Prisma.Decimal(totalAmount),
        runningBalance: purchaseBalance,
        description: `Purchase invoice ${invoiceNumber}`,
        referenceNumber: invoiceNumber
      }
    });

    await tx.stockMovement.create({
      data: {
        productId: product.id,
        transactionId: purchase.id,
        movementType: 'PURCHASE',
        quantity: new Prisma.Decimal(10),
        unitCost: new Prisma.Decimal(120),
        notes: `Purchase invoice ${invoiceNumber}`
      }
    });

    const newQuantity = new Prisma.Decimal(10).plus(new Prisma.Decimal((await tx.stockBalance.findUnique({ where: { productId: product.id } }))?.quantityOnHand ?? 0));
    await tx.stockBalance.upsert({
      where: { productId: product.id },
      update: {
        quantityOnHand: newQuantity,
        averageCost: new Prisma.Decimal(120)
      },
      create: {
        productId: product.id,
        quantityOnHand: newQuantity,
        reservedQuantity: new Prisma.Decimal(0),
        averageCost: new Prisma.Decimal(120)
      }
    });

    await tx.product.update({
      where: { id: product.id },
      data: {
        defaultPurchasePrice: new Prisma.Decimal(120),
        defaultSellingPrice: new Prisma.Decimal(0)
      }
    });

    return purchase.id;
  }, { timeout: 15000 });

  console.log('Purchase transaction completed successfully:', purchaseId);
}

run()
  .catch((error) => {
    console.error('Purchase transaction verification failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
