require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const rows = await prisma.smsNotification.findMany({
      where: { transactionId: { not: null } },
      select: { transactionId: true, partyId: true, companyId: true, transaction: { select: { partyId: true, companyId: true } } }
    });
    const partyIds = Array.from(new Set(rows.filter(r => r.transaction?.partyId != null).map(r => r.transaction.partyId)));
    const companyIds = Array.from(new Set(rows.filter(r => r.transaction?.companyId != null).map(r => r.transaction.companyId)));
    console.log('partyIds via tx', partyIds);
    console.log('companyIds via tx', companyIds);
    console.log('total rows', rows.length);
    const summary = {};
    for (const row of rows) {
      const key = `${row.partyId ?? 'null'}|${row.companyId ?? 'null'}|${row.transaction?.partyId ?? 'null'}|${row.transaction?.companyId ?? 'null'}`;
      summary[key] = (summary[key] || 0) + 1;
    }
    console.log(summary);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
