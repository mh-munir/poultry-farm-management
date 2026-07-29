'use server';

import { prisma } from '@/server/db';
import { requireRole } from '@/lib/auth';

export async function resetDatabaseForTesting() {
  await requireRole(['ADMIN']);

  await prisma.smsNotification.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockBalance.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.dueAdjustment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.party.deleteMany();
  await prisma.company.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.report.deleteMany();

  const sequences = [
    'Party_id_seq',
    'Company_id_seq',
    'ProductCategory_id_seq',
    'Product_id_seq',
    'StockBalance_id_seq',
    'StockMovement_id_seq',
    'Transaction_id_seq',
    'TransactionItem_id_seq',
    'SmsNotification_id_seq',
    'Payment_id_seq',
    'PaymentAllocation_id_seq',
    'LedgerEntry_id_seq',
    'DueAdjustment_id_seq',
    'Report_id_seq',
    'Expense_id_seq'
  ];

  for (const seq of sequences) {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE "${seq}" RESTART WITH 1`);
  }

  return { success: true, message: 'Database reset successfully.' };
}
