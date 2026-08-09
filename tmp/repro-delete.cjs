require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const party = await prisma.party.findFirst({ select: { id: true, name: true } });
  const company = await prisma.company.findFirst({ select: { id: true, name: true } });
  console.log('party', party);
  console.log('company', company);

  if (party) {
    const [transactionCount, paymentCount, ledgerCount, dueAdjustmentCount, smsCount, smsByTransactionCount] = await Promise.all([
      prisma.transaction.count({ where: { partyId: party.id } }),
      prisma.payment.count({ where: { partyId: party.id } }),
      prisma.ledgerEntry.count({ where: { partyId: party.id } }),
      prisma.dueAdjustment.count({ where: { partyId: party.id } }),
      prisma.smsNotification.count({ where: { partyId: party.id } }),
      prisma.smsNotification.count({ where: { transaction: { partyId: party.id } } })
    ]);
    console.log('party counts', { transactionCount, paymentCount, ledgerCount, dueAdjustmentCount, smsCount, smsByTransactionCount });
  }

  if (company) {
    const [transactionCount, paymentCount, ledgerCount, dueAdjustmentCount, smsCount, smsByTransactionCount, productCount] = await Promise.all([
      prisma.transaction.count({ where: { companyId: company.id } }),
      prisma.payment.count({ where: { companyId: company.id } }),
      prisma.ledgerEntry.count({ where: { companyId: company.id } }),
      prisma.dueAdjustment.count({ where: { companyId: company.id } }),
      prisma.smsNotification.count({ where: { companyId: company.id } }),
      prisma.smsNotification.count({ where: { transaction: { companyId: company.id } } }),
      prisma.product.count({ where: { companyId: company.id } })
    ]);
    console.log('company counts', { transactionCount, paymentCount, ledgerCount, dueAdjustmentCount, smsCount, smsByTransactionCount, productCount });
  }
}

main()
  .catch((error) => {
    console.error('ERROR', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
