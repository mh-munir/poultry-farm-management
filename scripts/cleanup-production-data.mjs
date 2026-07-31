import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanProductionData() {
  console.log('Starting production data cleanup...');
  const counts = {};

  try {
    const tablesToCheck = [
      'transactionItem',
      'paymentAllocation',
      'dueAdjustment',
      'ledgerEntry',
      'smsNotification',
      'report',
      'expense',
      'stockMovement',
      'payment',
      'transaction',
      'stockBalance',
      'product',
      'party',
      'company',
      'productCategory',
      'adminCreationOtp',
    ];

    for (const model of tablesToCheck) {
      const result = await prisma[model].count();
      counts[model] = result;
      if (result > 0) {
        console.log(`${model}: ${result} records found`);
      }
    }

    if (Object.values(counts).every((c) => c === 0)) {
      console.log('No test data found. Database is already clean.');
      await prisma.$disconnect();
      return;
    }

    await prisma.$transaction(async (tx) => {
      console.log('\nDeleting in dependency order...');

      const transactionItems = await tx.transactionItem.deleteMany({});
      console.log(`Deleted ${transactionItems.count} TransactionItems`);

      const paymentAllocations = await tx.paymentAllocation.deleteMany({});
      console.log(`Deleted ${paymentAllocations.count} PaymentAllocations`);

      const dueAdjustments = await tx.dueAdjustment.deleteMany({});
      console.log(`Deleted ${dueAdjustments.count} DueAdjustments`);

      const ledgerEntries = await tx.ledgerEntry.deleteMany({});
      console.log(`Deleted ${ledgerEntries.count} LedgerEntries`);

      const smsNotifications = await tx.smsNotification.deleteMany({});
      console.log(`Deleted ${smsNotifications.count} SmsNotifications`);

      const reports = await tx.report.deleteMany({});
      console.log(`Deleted ${reports.count} Reports`);

      const expenses = await tx.expense.deleteMany({});
      console.log(`Deleted ${expenses.count} Expenses`);

      const stockMovements = await tx.stockMovement.deleteMany({});
      console.log(`Deleted ${stockMovements.count} StockMovements`);

      const payments = await tx.payment.deleteMany({});
      console.log(`Deleted ${payments.count} Payments`);

      const transactions = await tx.transaction.deleteMany({});
      console.log(`Deleted ${transactions.count} Transactions`);

      const stockBalances = await tx.stockBalance.deleteMany({});
      console.log(`Deleted ${stockBalances.count} StockBalances`);

      const products = await tx.product.deleteMany({});
      console.log(`Deleted ${products.count} Products`);

      const parties = await tx.party.deleteMany({});
      console.log(`Deleted ${parties.count} Parties`);

      const companies = await tx.company.deleteMany({});
      console.log(`Deleted ${companies.count} Companies`);

      const productCategories = await tx.productCategory.deleteMany({});
      console.log(`Deleted ${productCategories.count} ProductCategories`);

      const adminCreationOtps = await tx.adminCreationOtp.deleteMany({});
      console.log(`Deleted ${adminCreationOtps.count} AdminCreationOtps`);
    });

    console.log('\nVerifying preserved records...');
    const preserved = ['user', 'setting', 'verificationToken', 'account', 'session'];
    for (const model of preserved) {
      const count = await prisma[model].count();
      console.log(`${model}: ${count} records preserved`);
    }

    console.log('\nProduction cleanup completed successfully.');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanProductionData();
