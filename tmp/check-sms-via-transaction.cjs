require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const rows = await prisma.smsNotification.findMany({
      where: {
        transactionId: { not: null }
      },
      select: {
        id: true,
        transactionId: true,
        partyId: true,
        companyId: true,
        transaction: {
          select: {
            id: true,
            partyId: true,
            companyId: true,
            transactionType: true
          }
        }
      }
    });

    const viaTransactionOnly = rows.filter((row) => row.partyId === null || row.companyId === null);
    console.log('total rows', rows.length);
    console.log('viaTransactionOnly count', viaTransactionOnly.length);
    console.log('sample viaTransactionOnly', viaTransactionOnly.slice(0, 20));

    const partyOrCompanyViaTx = rows.reduce((acc, row) => {
      const partyKey = row.transaction?.partyId != null ? `party:${row.transaction.partyId}` : null;
      const companyKey = row.transaction?.companyId != null ? `company:${row.transaction.companyId}` : null;
      if (partyKey) acc.add(partyKey);
      if (companyKey) acc.add(companyKey);
      return acc;
    }, new Set());
    console.log('affected entities count', partyOrCompanyViaTx.size);
    console.log('affected entities sample', Array.from(partyOrCompanyViaTx).slice(0, 20));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
