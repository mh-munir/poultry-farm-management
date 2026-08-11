import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config();

const prisma = new PrismaClient();

async function main() {
  const party = await prisma.party.findFirst({
    where: { openingBalance: -30000 },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      openingBalance: true,
      openingBalanceType: true,
      createdAt: true,
      updatedAt: true
    }
  });
  if (!party) {
    console.log('No party found with openingBalance = -30000');
    return;
  }

  const transactions = await prisma.transaction.findMany({
    where: { partyId: party.id, transactionType: 'SALE' },
    orderBy: { transactionDate: 'asc' },
    select: { id: true, totalAmount: true, paidAmount: true, dueAmount: true, invoiceNumber: true, transactionDate: true }
  });

  const sale5200 = transactions.filter((txn) => Number(txn.totalAmount) === 5200);

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: { partyId: party.id },
    orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
    select: { id: true, entryDate: true, entryType: true, amount: true, runningBalance: true, transactionId: true, paymentId: true, description: true }
  });

  const summary = await prisma.$queryRaw`
    SELECT
      SUM(CASE WHEN t."transactionType" = 'SALE' THEN t."totalAmount" ELSE 0 END) AS "saleTotal",
      SUM(CASE WHEN t."transactionType" = 'SALE' THEN t."paidAmount" ELSE 0 END) AS "salePaid",
      SUM(CASE WHEN t."transactionType" = 'SALE' THEN t."dueAmount" ELSE 0 END) AS "saleDue"
    FROM "Transaction" t
    WHERE t."partyId" = ${party.id}
  `;

  const latestLedger = ledgerEntries[0];

  console.log(JSON.stringify({ party, transactions, sale5200, latestLedger, summary }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
