import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
console.log('DATABASE_URL exists in runtime = ' + (url ? 'YES' : 'NO'));
if (url) {
  const parsed = new URL(url);
  console.log('DATABASE_URL host = ' + parsed.hostname);
  console.log('DATABASE_URL port = ' + (parsed.port || '5432'));
}

const prisma = new PrismaClient({
  datasources: { db: { url } }
});

try {
  const select1 = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log('PRISMA_SELECT_1 = ' + JSON.stringify(select1[0]));

  const party = await prisma.party.findFirst({ select: { id: true, name: true } });
  console.log('PARTY_READ = ' + JSON.stringify(party));

  const purchaseItem = await prisma.transactionItem.findFirst({ select: { id: true, quantity: true, unitPrice: true, lineTotal: true } });
  console.log('PURCHASEITEM_READ = ' + JSON.stringify(purchaseItem));

  const tx = await prisma.transaction.findFirst({ select: { id: true, totalAmount: true, partyId: true } });
  console.log('TRANSACTION_READ = ' + JSON.stringify(tx));

  const ledger = await prisma.ledgerEntry.findFirst({ select: { id: true, amount: true, entryType: true } });
  console.log('LEDGER_READ = ' + JSON.stringify(ledger));

  const allocation = await prisma.paymentAllocation.findFirst({ select: { id: true, amount: true } });
  console.log('PAYMENT_ALLOCATION_READ = ' + JSON.stringify(allocation));
} catch (error) {
  console.log('PRISMA_ERROR = ' + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
