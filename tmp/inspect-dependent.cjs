require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const partyId = 23;
    const party = await prisma.party.findUnique({ where: { id: partyId }, select: { id: true, name: true } });
    console.log('party', party);
    const ledgers = await prisma.ledgerEntry.findMany({ where: { partyId }, take: 5 });
    console.log('ledger sample', ledgers);
    const trxs = await prisma.transaction.findMany({ where: { partyId }, take: 5 });
    console.log('transaction sample', trxs);
    const payments = await prisma.payment.findMany({ where: { partyId }, take: 5 });
    console.log('payment sample', payments);
    const dues = await prisma.dueAdjustment.findMany({ where: { partyId }, take: 5 });
    console.log('due sample', dues);
    const sms = await prisma.smsNotification.findMany({ where: { partyId }, take: 5 });
    console.log('sms sample', sms);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
