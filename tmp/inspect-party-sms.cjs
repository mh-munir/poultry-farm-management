require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectParty(partyId) {
  const [transactionCount, transactionItemCount, paymentCount, ledgerCount, dueAdjustmentCount, smsPartyIdCount, smsTransactionCount, stockMovementCount, paymentAllocationCount] = await Promise.all([
    prisma.transaction.count({ where: { partyId } }),
    prisma.transactionItem.count({ where: { transaction: { partyId } } }),
    prisma.payment.count({ where: { partyId } }),
    prisma.ledgerEntry.count({ where: { partyId } }),
    prisma.dueAdjustment.count({ where: { partyId } }),
    prisma.smsNotification.count({ where: { partyId } }),
    prisma.smsNotification.count({ where: { transaction: { partyId } } }),
    prisma.stockMovement.count({ where: { transaction: { partyId } } }),
    prisma.paymentAllocation.count({ where: { OR: [{ payment: { partyId } }, { transaction: { partyId } }] } })
  ]);
  console.log('party', partyId, {
    transactionCount,
    transactionItemCount,
    paymentCount,
    ledgerCount,
    dueAdjustmentCount,
    smsPartyIdCount,
    smsTransactionCount,
    stockMovementCount,
    paymentAllocationCount
  });
}

(async () => {
  try {
    await inspectParty(1);
    await inspectParty(50);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
