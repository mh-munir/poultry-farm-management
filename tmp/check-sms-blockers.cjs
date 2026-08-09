require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const partySmsViaTx = await prisma.smsNotification.findFirst({
    where: { partyId: null, transactionId: { not: null } },
    select: { id: true, transactionId: true }
  });
  console.log('partySmsViaTx example', partySmsViaTx);

  const companySmsViaTx = await prisma.smsNotification.findFirst({
    where: { companyId: null, transactionId: { not: null } },
    select: { id: true, transactionId: true }
  });
  console.log('companySmsViaTx example', companySmsViaTx);

  const partySmsCount = await prisma.smsNotification.count({ where: { partyId: null, transaction: { partyId: { not: null } } } });
  console.log('partySmsCount via tx only', partySmsCount);

  const companySmsCount = await prisma.smsNotification.count({ where: { companyId: null, transaction: { companyId: { not: null } } } });
  console.log('companySmsCount via tx only', companySmsCount);
}

main().catch(e => { console.error('ERROR', e); process.exit(1); }).finally(async () => await prisma.$disconnect());
