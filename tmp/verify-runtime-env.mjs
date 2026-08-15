import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

const path = './.env';
const raw = fs.readFileSync(path, 'utf8');
const match = raw.match(/DATABASE_URL\s*=\s*"?([^\r\n" ]+)/);

console.log('DATABASE_URL exists in .env = ' + (match ? 'YES' : 'NO'));
if (match) {
  const url = match[1];
  const safeHost = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unparseable';
    }
  })();
  const safePort = (() => {
    try {
      return new URL(url).port || '5432';
    } catch {
      return 'unknown';
    }
  })();
  console.log('DATABASE_URL host = ' + safeHost);
  console.log('DATABASE_URL port = ' + safePort);
}

const runtimeUrl = process.env.DATABASE_URL;
console.log('DATABASE_URL exists in runtime = ' + (runtimeUrl ? 'YES' : 'NO'));
if (runtimeUrl) {
  const parsed = new URL(runtimeUrl);
  console.log('Runtime host = ' + parsed.hostname);
  console.log('Runtime port = ' + (parsed.port || '5432'));
}

const prisma = new PrismaClient({ datasources: { db: { url: runtimeUrl ?? match?.[1] } } });

try {
  const result = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log('PRISMA_SELECT_1 = ' + JSON.stringify(result[0]));

  const party = await prisma.party.findFirst({ select: { id: true } });
  console.log('PARTY_READ = ' + JSON.stringify(party));

  const tx = await prisma.transaction.findFirst({ select: { id: true } });
  console.log('TRANSACTION_READ = ' + JSON.stringify(tx));

  const item = await prisma.transactionItem.findFirst({ select: { id: true } });
  console.log('PURCHASEITEM_READ = ' + JSON.stringify(item));

  const ledger = await prisma.ledgerEntry.findFirst({ select: { id: true } });
  console.log('LEDGER_READ = ' + JSON.stringify(ledger));

  const allocation = await prisma.paymentAllocation.findFirst({ select: { id: true } });
  console.log('PAYMENT_ALLOCATION_READ = ' + JSON.stringify(allocation));
} catch (error) {
  console.log('PRISMA_ERROR = ' + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
