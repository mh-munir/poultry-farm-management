require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const rows = await prisma.smsNotification.findMany({
      where: { transactionId: { not: null } },
      select: { id: true, transactionId: true, partyId: true, companyId: true, transaction: { select: { partyId: true, companyId: true } } },
      take: 20
    });
    console.log('transaction-linked sms rows sample', rows);
    const partyIds = [...new Set(rows.filter(r => r.transaction?.partyId != null).map(r => r.transaction.partyId))];
    const companyIds = [...new Set(rows.filter(r => r.transaction?.companyId != null).map(r => r.transaction.companyId))];
    console.log('partyIds via transaction', partyIds);
    console.log('companyIds via transaction', companyIds);
    for (const partyId of partyIds.slice(0, 10)) {
      const count = await prisma.smsNotification.count({ where: { transaction: { partyId } } });
      console.log('partyId', partyId, 'sms via transaction count', count);
    }
    for (const companyId of companyIds.slice(0, 10)) {
      const count = await prisma.smsNotification.count({ where: { transaction: { companyId } } });
      console.log('companyId', companyId, 'sms via transaction count', count);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
