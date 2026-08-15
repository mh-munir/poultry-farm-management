import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const envPath = path.resolve(process.cwd(), '.env');
const lines = [];

let prisma;

try {
  if (!fs.existsSync(envPath)) {
    lines.push('DATABASE_URL loaded: FAIL');
    lines.push('FIRST FAILING LAYER: .env file missing');
    lines.push('EXACT ERROR: .env file not found at ' + envPath);
    console.log(lines.join('\n'));
    process.exitCode = 1;
  } else {
    const envText = fs.readFileSync(envPath, 'utf8');
    const match = envText.match(/DATABASE_URL\s*=\s*"?([^\r\n" ]+)/);

    if (!match) {
      lines.push('DATABASE_URL loaded: FAIL');
      lines.push('FIRST FAILING LAYER: .env missing DATABASE_URL');
      lines.push('EXACT ERROR: DATABASE_URL not found in .env');
      console.log(lines.join('\n'));
      process.exitCode = 1;
    } else {
      const url = match[1];
      const parsed = new URL(url);

      lines.push('DATABASE_URL loaded: PASS');
      lines.push('HOST: ' + parsed.hostname);
      lines.push('PORT: ' + (parsed.port || '5432'));

      prisma = new PrismaClient({
        datasources: {
          db: { url }
        }
      });

      lines.push('Prisma initialization: PASS');
      const select1 = await prisma.$queryRaw`SELECT 1 AS ok`;
      lines.push('SELECT 1: PASS');
      lines.push('SELECT 1 RESULT: ' + JSON.stringify(select1[0]));

      const party = await prisma.party.findFirst({ select: { id: true, name: true } });
      lines.push('Party read: ' + (party ? 'PASS' : 'NO_DATA'));

      const purchaseItem = await prisma.transactionItem.findFirst({ select: { id: true, quantity: true, lineTotal: true } });
      lines.push('PurchaseItem read: ' + (purchaseItem ? 'PASS' : 'NO_DATA'));

      const transaction = await prisma.transaction.findFirst({ select: { id: true, totalAmount: true } });
      lines.push('Transaction read: ' + (transaction ? 'PASS' : 'NO_DATA'));

      const ledger = await prisma.ledgerEntry.findFirst({ select: { id: true, amount: true } });
      lines.push('LedgerEntry read: ' + (ledger ? 'PASS' : 'NO_DATA'));

      const allocation = await prisma.paymentAllocation.findFirst({ select: { id: true, amount: true } });
      lines.push('PaymentAllocation read: ' + (allocation ? 'PASS' : 'NO_DATA'));

      console.log(lines.join('\n'));
    }
  }
} catch (error) {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : 'UNKNOWN';
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN';
  const message = error instanceof Error ? error.message : String(error);

  lines.push('DATABASE_URL loaded: PASS');
  lines.push('Prisma initialization: FAIL');
  lines.push('SELECT 1: FAIL');
  lines.push('FIRST FAILING LAYER: Prisma/PostgreSQL runtime layer');
  lines.push('ERROR NAME: ' + name);
  lines.push('ERROR CODE: ' + code);
  lines.push('EXACT ERROR: ' + message);

  console.log(lines.join('\n'));
  process.exitCode = 1;
} finally {
  if (prisma) {
    try {
      await prisma.$disconnect();
      lines.push('Prisma disconnect: PASS');
      if (process.exitCode !== 1) {
        console.log(lines.join('\n'));
      }
    } catch (disconnectError) {
      const disconnectMessage = disconnectError instanceof Error ? disconnectError.message : String(disconnectError);
      lines.push('Prisma disconnect: FAIL');
      lines.push('DISCONNECT ERROR: ' + disconnectMessage);
      console.log(lines.join('\n'));
      process.exitCode = 1;
    }
  }
}
