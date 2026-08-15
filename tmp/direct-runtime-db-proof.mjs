import fs from 'node:fs';
import path from 'node:path';
import { connect as netConnect } from 'node:net';
import { PrismaClient } from '@prisma/client';

const outPath = path.resolve(process.cwd(), 'tmp/direct-runtime-db-proof-output.txt');
const lines = [];

const envText = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
const match = envText.match(/DATABASE_URL\s*=\s*"?([^\r\n" ]+)/);
if (!match) {
  lines.push('DATABASE_URL loaded: FAIL');
  lines.push('FIRST FAILING LAYER: .env missing DATABASE_URL');
  lines.push('EXACT ERROR: DATABASE_URL not found in .env');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(lines.join('\n'));
  process.exit(1);
}

const url = match[1];
const parsed = new URL(url);
const host = parsed.hostname;
const port = parsed.port ? Number(parsed.port) : 5432;

lines.push('DATABASE_URL loaded: YES');
lines.push('DATABASE HOST: ' + host);
lines.push('DATABASE PORT: ' + port);

const tcp = netConnect({ host, port });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('TCP timeout after 10000ms')), 10000);
  tcp.once('connect', () => {
    clearTimeout(timer);
    lines.push('TCP 5432: PASS');
    resolve();
  });
  tcp.once('error', (error) => {
    clearTimeout(timer);
    reject(error);
  });
});

tcp.destroy();

const prisma = new PrismaClient({ datasources: { db: { url } } });
const allSuccess = [];
try {
  const select1 = await prisma.$queryRaw`SELECT 1 AS ok`;
  lines.push('PRISMA SELECT 1: PASS');
  lines.push('SELECT 1 RESULT: ' + JSON.stringify(select1[0]));
  allSuccess.push('select1');

  const party = await prisma.party.findFirst({ select: { id: true, name: true } });
  lines.push('Party read: ' + (party ? 'PASS' : 'NO_DATA'));
  if (party) allSuccess.push('party');

  const purchaseItem = await prisma.transactionItem.findFirst({ select: { id: true, quantity: true, lineTotal: true } });
  lines.push('PurchaseItem read: ' + (purchaseItem ? 'PASS' : 'NO_DATA'));
  if (purchaseItem) allSuccess.push('purchaseItem');

  const tx = await prisma.transaction.findFirst({ select: { id: true, totalAmount: true } });
  lines.push('Transaction read: ' + (tx ? 'PASS' : 'NO_DATA'));
  if (tx) allSuccess.push('transaction');

  const ledger = await prisma.ledgerEntry.findFirst({ select: { id: true, amount: true } });
  lines.push('LedgerEntry read: ' + (ledger ? 'PASS' : 'NO_DATA'));
  if (ledger) allSuccess.push('ledger');

  const allocation = await prisma.paymentAllocation.findFirst({ select: { id: true, amount: true } });
  lines.push('PaymentAllocation read: ' + (allocation ? 'PASS' : 'NO_DATA'));
  if (allocation) allSuccess.push('allocation');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN';
  lines.push('PRISMA SELECT 1: FAIL');
  lines.push('FIRST FAILING LAYER: Prisma/PostgreSQL query layer');
  lines.push('EXACT ERROR: ' + message);
  lines.push('ERROR CODE: ' + code);
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(lines.join('\n'));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

if (process.exitCode !== 1) {
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(lines.join('\n'));
}
