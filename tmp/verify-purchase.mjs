import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const tx = await prisma.transaction.findFirst({
    where: { referenceNumber: 'REG-TEST-001' },
    orderBy: { id: 'desc' },
    include: {
      transactionItems: true,
      ledgerEntries: true,
      payments: { include: { payment: true } }
    }
  });

  console.log(JSON.stringify({
    tx: tx ? {
      id: tx.id,
      invoiceNumber: tx.invoiceNumber,
      totalAmount: tx.totalAmount.toString(),
      paidAmount: tx.paidAmount.toString(),
      dueAmount: tx.dueAmount.toString(),
      companyId: tx.companyId,
      status: tx.status,
      referenceNumber: tx.referenceNumber,
      items: tx.transactionItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString()
      })),
      ledgerEntries: tx.ledgerEntries.map((entry) => ({
        type: entry.entryType,
        amount: entry.amount.toString(),
        runningBalance: entry.runningBalance.toString()
      })),
      payments: tx.payments.map((payment) => ({
        id: payment.payment.id,
        amount: payment.payment.amount.toString(),
        method: payment.payment.paymentMethod
      }))
    } : null
  }, null, 2));

  const feedProduct = await prisma.product.findFirst({ where: { code: 'FEED-002' }, select: { id: true, name: true } });
  const balance = feedProduct ? await prisma.stockBalance.findUnique({ where: { productId: feedProduct.id } }) : null;
  console.log(JSON.stringify({ feedProduct, balance: balance ? { productId: balance.productId, quantityOnHand: balance.quantityOnHand.toString(), averageCost: balance.averageCost?.toString() ?? null } : null }, null, 2));
} finally {
  await prisma.$disconnect();
}
