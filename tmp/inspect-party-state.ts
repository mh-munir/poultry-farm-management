import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config();

const prisma = new PrismaClient();

function toNumber(value: number | string | { toString(): string } | null | undefined) {
  return Number(value?.toString() ?? 0);
}

function summarizePartyAccount(partyType: string, transactions: Array<{ transactionType: string; totalAmount: number; paidAmount: number; dueAmount: number }>, payments: Array<{ amount: number }>, openingBalance = 0) {
  let customerInvoiced = 0;
  let customerPaid = 0;
  let customerDue = 0;
  let partySupplierInvoiced = 0;
  let partySupplierPaid = 0;
  let partySupplierDue = 0;
  const standalonePayment = payments.reduce((total, payment) => total + payment.amount, 0);

  for (const transaction of transactions) {
    const totalAmount = transaction.totalAmount;
    const paidAmount = transaction.paidAmount;
    const dueAmount = transaction.dueAmount;

    if (transaction.transactionType === 'SALE') {
      customerInvoiced += totalAmount;
      customerPaid += paidAmount;
      customerDue += dueAmount;
    }

    if (transaction.transactionType === 'PURCHASE') {
      partySupplierInvoiced += totalAmount;
      partySupplierPaid += paidAmount;
      partySupplierDue += dueAmount;
    }

    if (transaction.transactionType === 'PAYMENT') {
      // Note: in the current DB this may be unused for party-ledger-only payments
      // but preserve the logic from getPartyAccountSummary.
      customerPaid += totalAmount;
    }
  }

  if (partyType === 'PARTY') {
    partySupplierPaid += standalonePayment;
    partySupplierDue = Math.max(0, partySupplierDue - standalonePayment);
  } else {
    customerPaid += standalonePayment;
    customerDue += openingBalance;
    customerDue = Math.max(0, customerDue - standalonePayment);
  }

  const offsetApplied = Math.min(customerDue, partySupplierDue);
  const netCustomerDue = Math.max(0, customerDue - offsetApplied);
  const netPartySupplierDue = Math.max(0, partySupplierDue - offsetApplied);

  return {
    customerInvoiced,
    customerPaid,
    customerDue,
    supplierInvoiced: partySupplierInvoiced,
    supplierPaid: partySupplierPaid,
    supplierDue: partySupplierDue,
    offsetApplied,
    netCustomerDue,
    netSupplierDue: netPartySupplierDue,
    totalInvoiced: customerInvoiced + partySupplierInvoiced,
    totalPaid: customerPaid + partySupplierPaid,
    totalDue: netCustomerDue + netPartySupplierDue
  };
}

async function run() {
  const party = await prisma.party.findFirst({
    where: { openingBalance: -30000 },
    orderBy: { id: 'asc' }
  });

  if (!party) {
    console.log('No party with openingBalance = -30000 found.');
    process.exit(1);
  }

  const transactions = await prisma.transaction.findMany({
    where: { partyId: party.id },
    orderBy: { transactionDate: 'asc' }
  });

  const payments = await prisma.payment.findMany({
    where: { partyId: party.id }
  });

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: { partyId: party.id },
    orderBy: [{ entryDate: 'desc' }, { id: 'desc' }]
  });

  const txnSummary = await prisma.$queryRaw<Array<{ transactionType: string; totalAmount: any; paidAmount: any; dueAmount: any }>>`
    SELECT "transactionType", SUM("totalAmount") AS "totalAmount", SUM("paidAmount") AS "paidAmount", SUM("dueAmount") AS "dueAmount"
    FROM "Transaction"
    WHERE "partyId" = ${party.id}
    GROUP BY "transactionType"
  `;

  const paymentSummary = await prisma.$queryRaw<Array<{ totalPaid: any }>>`
    SELECT COALESCE(SUM("amount"), 0) AS "totalPaid"
    FROM "Payment" p
    WHERE p."partyId" = ${party.id}
      AND NOT EXISTS (
        SELECT 1 FROM "PaymentAllocation" pa WHERE pa."paymentId" = p."id"
      )
  `;

  const latestLedger = ledgerEntries[0];
  const computedSummary = summarizePartyAccount(
    party.partyType,
    txnSummary.map((row) => ({
      transactionType: row.transactionType,
      totalAmount: toNumber(row.totalAmount),
      paidAmount: toNumber(row.paidAmount),
      dueAmount: toNumber(row.dueAmount)
    })),
    [{ amount: toNumber(paymentSummary?.[0]?.totalPaid ?? 0) }],
    toNumber(party.openingBalance)
  );

  console.log(JSON.stringify({
    party: {
      id: party.id,
      name: party.name,
      partyType: party.partyType,
      openingBalance: party.openingBalance,
      openingBalanceType: party.openingBalanceType,
      transactionCount: transactions.length,
      paymentCount: payments.length
    },
    transactions: transactions.map((txn) => ({
      id: txn.id,
      transactionType: txn.transactionType,
      totalAmount: txn.totalAmount?.toString?.(),
      paidAmount: txn.paidAmount?.toString?.(),
      dueAmount: txn.dueAmount?.toString?.(),
      invoiceNumber: txn.invoiceNumber,
      transactionDate: txn.transactionDate
    })),
    latestLedger: latestLedger ? {
      id: latestLedger.id,
      entryType: latestLedger.entryType,
      amount: latestLedger.amount?.toString?.(),
      runningBalance: latestLedger.runningBalance?.toString?.(),
      transactionId: latestLedger.transactionId,
      paymentId: latestLedger.paymentId,
      description: latestLedger.description,
      entryDate: latestLedger.entryDate
    } : null,
    computedSummary,
    computedCurrentBalance: latestLedger ? Number(latestLedger.runningBalance?.toString?.() ?? party.openingBalance) : Number(party.openingBalance)
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
