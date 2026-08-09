require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const partyId = 23;
    const companyId = 20;

    console.log('party blockers for', partyId);
    const partyCounts = await Promise.all([
      prisma.transaction.count({ where: { partyId } }),
      prisma.payment.count({ where: { partyId } }),
      prisma.ledgerEntry.count({ where: { partyId } }),
      prisma.dueAdjustment.count({ where: { partyId } }),
      prisma.smsNotification.count({ where: { partyId } }),
      prisma.transaction.count({ where: { partyId } }).then(n => n),
      prisma.smsNotification.count({ where: { transaction: { partyId } } }),
      prisma.ledgerEntry.count({ where: { transaction: { partyId } } })
    ]);
    console.log({ partyCounts });

    try {
      await prisma.party.delete({ where: { id: partyId } });
      console.log('party delete success');
    } catch (error) {
      console.error('party delete error', error);
    }

    console.log('company blockers for', companyId);
    const companyCounts = await Promise.all([
      prisma.transaction.count({ where: { companyId } }),
      prisma.payment.count({ where: { companyId } }),
      prisma.ledgerEntry.count({ where: { companyId } }),
      prisma.dueAdjustment.count({ where: { companyId } }),
      prisma.smsNotification.count({ where: { companyId } }),
      prisma.product.count({ where: { companyId } }),
      prisma.smsNotification.count({ where: { transaction: { companyId } } }),
      prisma.ledgerEntry.count({ where: { transaction: { companyId } } })
    ]);
    console.log({ companyCounts });

    try {
      await prisma.company.delete({ where: { id: companyId } });
      console.log('company delete success');
    } catch (error) {
      console.error('company delete error', error);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();