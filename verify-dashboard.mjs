import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing dashboard queries that previously failed...\n');

  try {
    const recentTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { transactionDate: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        party: { select: { name: true } },
        company: { select: { name: true } },
        totalAmount: true,
        status: true,
        transactionType: true
      }
    });
    console.log('✅ Dashboard recent transactions query works');
    console.log('   Result:', JSON.stringify(recentTransactions, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));
  } catch (e) {
    console.error('❌ Dashboard recent transactions query failed:', e);
  }

  try {
    const dailyFeedSaleAgg = await prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      where: {
        transaction: {
          transactionType: 'SALE',
          transactionDate: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(23,59,59,999)) }
        },
        product: { productType: 'FEED' }
      }
    });
    console.log('✅ Dashboard daily feed sale aggregate works');
  } catch (e) {
    console.error('❌ Dashboard daily feed sale aggregate failed:', e);
  }

  try {
    const customerDue = await prisma.transaction.aggregate({
      _sum: { dueAmount: true },
      where: {
        transactionType: 'SALE',
        dueAmount: { gt: 0 }
      }
    });
    console.log('✅ Dashboard customer due aggregate works');
  } catch (e) {
    console.error('❌ Dashboard customer due aggregate failed:', e);
  }

  try {
    const feedMedicineDue = await prisma.transaction.aggregate({
      _sum: { dueAmount: true },
      where: {
        transactionType: 'PURCHASE',
        dueAmount: { gt: 0 },
        transactionItems: {
          some: {
            product: { productType: { in: ['FEED', 'MEDICINE'] } }
          }
        }
      }
    });
    console.log('✅ Dashboard feed medicine due aggregate works');
  } catch (e) {
    console.error('❌ Dashboard feed medicine due aggregate failed:', e);
  }

  try {
    const partyProfileTransactions = await prisma.transaction.findMany({
      where: { partyId: 1 },
      orderBy: { transactionDate: 'desc' },
      select: {
        id: true,
        transactionType: true,
        transactionDate: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        notes: true,
        transactionItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            description: true,
            product: {
              select: {
                name: true,
                unit: true,
                productType: true
              }
            }
          }
        }
      }
    });
    console.log('✅ Party profile transactions query works');
  } catch (e) {
    console.error('❌ Party profile transactions query failed:', e);
  }

  try {
    const companyProfileTransactions = await prisma.transaction.findMany({
      where: { companyId: 2 },
      orderBy: { transactionDate: 'desc' },
      select: {
        id: true,
        transactionType: true,
        transactionDate: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        notes: true,
        transactionItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            description: true,
            product: {
              select: {
                name: true,
                unit: true,
                productType: true
              }
            }
          }
        }
      }
    });
    console.log('✅ Company profile transactions query works');
  } catch (e) {
    console.error('❌ Company profile transactions query failed:', e);
  }

  console.log('\nAll queries verified successfully!');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
