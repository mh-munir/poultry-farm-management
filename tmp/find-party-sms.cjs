require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const rows = await prisma.smsNotification.findMany({
      where: {
        transaction: { partyId: { not: null } }
      },
      select: {
        id: true,
        transactionId: true,
        partyId: true,
        companyId: true,
        transaction: { select: { partyId: true, companyId: true } }
      },
      take: 10
    });
    console.log('rows', rows);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
