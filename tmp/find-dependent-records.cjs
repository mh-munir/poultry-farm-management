require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const party = await prisma.party.findFirst({
      where: {
        OR: [
          { transactions: { some: {} } },
          { payments: { some: {} } },
          { ledgerEntries: { some: {} } },
          { dueAdjustments: { some: {} } },
          { smsNotifications: { some: {} } }
        ]
      },
      select: { id: true, name: true }
    });
    console.log('dependent party', party);
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { transactions: { some: {} } },
          { payments: { some: {} } },
          { ledgerEntries: { some: {} } },
          { dueAdjustments: { some: {} } },
          { smsNotifications: { some: {} } },
          { products: { some: {} } }
        ]
      },
      select: { id: true, name: true }
    });
    console.log('dependent company', company);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
