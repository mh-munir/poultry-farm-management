import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const party = await prisma.party.findFirst({ where: { openingBalance: { lt: 0 } }, orderBy: { id: 'asc' } });
  console.log('party', party);
  if (!party) {
    console.log('No party with negative opening balance found.');
    return;
  }
  const txnSummary = await prisma.$queryRaw`
    SELECT "transactionType", SUM("totalAmount") AS "totalAmount", SUM("paidAmount") AS "paidAmount", SUM("dueAmount") AS "dueAmount"
    FROM "Transaction"
    WHERE "partyId" = ${party.id}
    GROUP BY "transactionType"
  `;
  console.log('txnSummary', txnSummary);
  const payments = await prisma.$queryRaw`
    SELECT COALESCE(SUM("amount"),0) AS "totalPaid"
    FROM "Payment"
    WHERE "partyId" = ${party.id}
      AND NOT EXISTS (
        SELECT 1 FROM "PaymentAllocation" pa WHERE pa."paymentId" = "Payment"."id"
      )
  `;
  console.log('payments', payments);
  const latestLedger = await prisma.ledgerEntry.findFirst({ where: { partyId: party.id }, orderBy: [{ entryDate: 'desc' }, { id: 'desc' }] });
  console.log('latestLedger', latestLedger);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
