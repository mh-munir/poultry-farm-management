import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const outPath = path.resolve(process.cwd(), 'tmp/fresh-runtime-db-proof-output.txt');
const lines = [];

const envText = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
const envMatch = envText.match(/DATABASE_URL\s*=\s*"?([^\r\n" ]+)/);

lines.push('DATABASE_URL exists in .env = ' + (envMatch ? 'YES' : 'NO'));
if (envMatch) {
  try {
    const parsed = new URL(envMatch[1]);
    lines.push('DATABASE_URL host = ' + parsed.hostname);
    lines.push('DATABASE_URL port = ' + (parsed.port || '5432'));
  } catch {
    lines.push('DATABASE_URL host = unparseable');
    lines.push('DATABASE_URL port = unknown');
  }
}

lines.push('DATABASE_URL exists in runtime = ' + (process.env.DATABASE_URL ? 'YES' : 'NO'));
if (process.env.DATABASE_URL) {
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    lines.push('Runtime host = ' + parsed.hostname);
    lines.push('Runtime port = ' + (parsed.port || '5432'));
  } catch {
    lines.push('Runtime host = unparseable');
    lines.push('Runtime port = unknown');
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || envMatch?.[1]
    }
  }
});

try {
  const select1 = await prisma.$queryRaw`SELECT 1 as ok`;
  lines.push('PRISMA_SELECT_1 = ' + JSON.stringify(select1[0]));

  const party = await prisma.party.findFirst({ select: { id: true, name: true } });
  lines.push('PARTY_READ = ' + JSON.stringify(party));

  const purchaseItem = await prisma.transactionItem.findFirst({ select: { id: true, quantity: true, unitPrice: true, lineTotal: true } });
  lines.push('PURCHASEITEM_READ = ' + JSON.stringify(purchaseItem));

  const tx = await prisma.transaction.findFirst({ select: { id: true, totalAmount: true, partyId: true } });
  lines.push('TRANSACTION_READ = ' + JSON.stringify(tx));

  const ledger = await prisma.ledgerEntry.findFirst({ select: { id: true, amount: true, entryType: true } });
  lines.push('LEDGER_READ = ' + JSON.stringify(ledger));

  const allocation = await prisma.paymentAllocation.findFirst({ select: { id: true, amount: true } });
  lines.push('PAYMENT_ALLOCATION_READ = ' + JSON.stringify(allocation));
} catch (error) {
  lines.push('PRISMA_ERROR = ' + (error instanceof Error ? error.message : String(error)));
  fs.writeFileSync(outPath, lines.join('\n'));
  console.error(lines.join('\n'));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

if (process.exitCode !== 1) {
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(lines.join('\n'));
}
