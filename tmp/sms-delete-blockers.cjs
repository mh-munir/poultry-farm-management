require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const partySmsCount = await prisma.smsNotification.count({ where: { partyId: null, transaction: { partyId: { not: null } } } });
    const partySmsExample = await prisma.smsNotification.findFirst({ where: { partyId: null, transaction: { partyId: { not: null } } }, select: { id: true, transactionId: true, companyId: true, partyId: true } });
    const companySmsCount = await prisma.smsNotification.count({ where: { companyId: null, transaction: { companyId: { not: null } } } });
    const companySmsExample = await prisma.smsNotification.findFirst({ where: { companyId: null, transaction: { companyId: { not: null } } }, select: { id: true, transactionId: true, companyId: true, partyId: true } });
    console.log({ partySmsCount, partySmsExample, companySmsCount, companySmsExample });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
