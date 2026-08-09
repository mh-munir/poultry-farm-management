require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const party = await prisma.party.findFirst({ where: { id: { not: 25 } }, select: { id: true, name: true } });
    if (party) {
      const [txn, pay, ledger, due, smsP, smsT, ledgerT, smsNT] = await Promise.all([
        prisma.transaction.count({ where: { partyId: party.id } }),
        prisma.payment.count({ where: { partyId: party.id } }),
        prisma.ledgerEntry.count({ where: { partyId: party.id } }),
        prisma.dueAdjustment.count({ where: { partyId: party.id } }),
        prisma.smsNotification.count({ where: { partyId: party.id } }),
        prisma.smsNotification.count({ where: { transaction: { partyId: party.id } } }),
        prisma.ledgerEntry.count({ where: { transaction: { partyId: party.id } } }),
        prisma.smsNotification.count({ where: { transaction: { partyId: party.id }, partyId: null } })
      ]);
      console.log('party block counts', party.id, party.name, { txn, pay, ledger, due, smsP, smsT, ledgerT, smsNT });
    }

    const company = await prisma.company.findFirst({ where: { id: { not: 19 } }, select: { id: true, name: true } });
    if (company) {
      const [txn, pay, ledger, due, smsP, smsT, ledgerT, smsNT, prod] = await Promise.all([
        prisma.transaction.count({ where: { companyId: company.id } }),
        prisma.payment.count({ where: { companyId: company.id } }),
        prisma.ledgerEntry.count({ where: { companyId: company.id } }),
        prisma.dueAdjustment.count({ where: { companyId: company.id } }),
        prisma.smsNotification.count({ where: { companyId: company.id } }),
        prisma.smsNotification.count({ where: { transaction: { companyId: company.id } } }),
        prisma.ledgerEntry.count({ where: { transaction: { companyId: company.id } } }),
        prisma.smsNotification.count({ where: { transaction: { companyId: company.id }, companyId: null } }),
        prisma.product.count({ where: { companyId: company.id } })
      ]);
      console.log('company block counts', company.id, company.name, { txn, pay, ledger, due, smsP, smsT, ledgerT, smsNT, prod });
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
