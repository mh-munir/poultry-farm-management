require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const companies = await prisma.company.findMany({
      where: {},
      select: { id: true, name: true }
    });
    for (const company of companies) {
      const [products, transactions, payments, ledger, dueAdjustments, smsNotifications] = await Promise.all([
        prisma.product.count({ where: { companyId: company.id } }),
        prisma.transaction.count({ where: { companyId: company.id } }),
        prisma.payment.count({ where: { companyId: company.id } }),
        prisma.ledgerEntry.count({ where: { companyId: company.id } }),
        prisma.dueAdjustment.count({ where: { companyId: company.id } }),
        prisma.smsNotification.count({ where: { companyId: company.id } })
      ]);
      if (products > 0 && transactions === 0 && payments === 0 && ledger === 0 && dueAdjustments === 0 && smsNotifications === 0) {
        console.log('company-only-products', company, { products, transactions, payments, ledger, dueAdjustments, smsNotifications });
        break;
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
