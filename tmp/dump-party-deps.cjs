require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const prisma = new PrismaClient();

async function main() {
  const parties = await prisma.party.findMany({ select: { id: true, name: true } });
  const bad = [];
  for (const party of parties) {
    const [transactionCount, paymentCount, ledgerCount, dueAdjustmentCount, smsCount, smsViaTxnCount] = await Promise.all([
      prisma.transaction.count({ where: { partyId: party.id } }),
      prisma.payment.count({ where: { partyId: party.id } }),
      prisma.ledgerEntry.count({ where: { partyId: party.id } }),
      prisma.dueAdjustment.count({ where: { partyId: party.id } }),
      prisma.smsNotification.count({ where: { partyId: party.id } }),
      prisma.smsNotification.count({ where: { transaction: { partyId: party.id } } })
    ]);
    if (transactionCount === 0 && paymentCount === 0 && ledgerCount === 0 && dueAdjustmentCount === 0 && smsCount === 0 && smsViaTxnCount > 0) {
      bad.push({ party, smsViaTxnCount });
    }
  }
  fs.writeFileSync('tmp/dump-party-deps.out.json', JSON.stringify({ bad }, null, 2));
}

main().catch((e) => {
  fs.writeFileSync('tmp/dump-party-deps.error.txt', String(e));
  console.error(e);
}).finally(() => prisma.$disconnect());
