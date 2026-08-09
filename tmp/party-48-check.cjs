require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const partyId = 48;
    const counts = await Promise.all([
      prisma.transaction.count({ where: { partyId } }),
      prisma.payment.count({ where: { partyId } }),
      prisma.ledgerEntry.count({ where: { partyId } }),
      prisma.dueAdjustment.count({ where: { partyId } }),
      prisma.smsNotification.count({ where: { partyId } }),
      prisma.smsNotification.count({ where: { transaction: { partyId } } }),
      prisma.ledgerEntry.count({ where: { transaction: { partyId } } }),
      prisma.transactionItem.count({ where: { transaction: { partyId } } }),
      prisma.stockMovement.count({ where: { transaction: { partyId } } }),
      prisma.paymentAllocation.count({ where: { OR: [{ payment: { partyId } }, { transaction: { partyId } }] } })
    ]);
    console.log({ partyId, counts });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
