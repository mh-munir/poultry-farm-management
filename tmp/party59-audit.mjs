import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';

const prisma = new PrismaClient();

const party = await prisma.party.findUnique({
  where: { id: 59 },
  select: {
    id: true,
    name: true,
    partyType: true,
    openingBalance: true,
    openingBalanceType: true,
    createdAt: true,
    updatedAt: true,
  }
});

const transactions = await prisma.transaction.findMany({
  where: { partyId: 59 },
  orderBy: { transactionDate: 'asc' },
  select: {
    id: true,
    transactionType: true,
    transactionDate: true,
    totalAmount: true,
    paidAmount: true,
    dueAmount: true,
    status: true,
    createdAt: true,
    invoiceNumber: true,
    referenceNumber: true,
  }
});

const payments = await prisma.payment.findMany({
  where: { partyId: 59 },
  orderBy: { paymentDate: 'asc' },
  select: {
    id: true,
    amount: true,
    paymentDate: true,
    status: true,
    paymentDirection: true,
    paymentMethod: true,
    referenceNumber: true,
    notes: true,
  }
});

const ledgerEntries = await prisma.ledgerEntry.findMany({
  where: { partyId: 59 },
  orderBy: { entryDate: 'asc' },
  select: {
    id: true,
    entryType: true,
    amount: true,
    runningBalance: true,
    entryDate: true,
    description: true,
    referenceNumber: true,
  }
});

const result = { party, transactions, payments, ledgerEntries };
await fs.writeFile('tmp/party59-audit.json', JSON.stringify(result, null, 2));
await prisma.$disconnect();
