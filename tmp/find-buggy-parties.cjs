require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const parties = await prisma.party.findMany({ select: { id: true, name: true } });
  for (const party of parties) {
    const [transactionCount, paymentCount, ledgerCount, dueAdjustmentCount, smsCount] = await Promise.all([
      prisma.transaction.count({ where: { partyId: party.id } }),
      prisma.payment.count({ where: { partyId: party.id } }),
      prisma.ledgerEntry.count({ where: { partyId: party.id } }),
      prisma.dueAdjustment.count({ where: { partyId: party.id } }),
      prisma.smsNotification.count({ where: { partyId: party.id } })
    ]);
    if (transactionCount === 0 && paymentCount === 0 && ledgerCount === 0 && dueAdjustmentCount === 0 && smsCount === 0) {
      const smsViaTransaction = await prisma.smsNotification.count({ where: { transaction: { partyId: party.id } } });
      if (smsViaTransaction > 0) {
        console.log('buggy party', party.id, party.name, 'smsViaTransaction', smsViaTransaction);
        break;
      }
    }
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
