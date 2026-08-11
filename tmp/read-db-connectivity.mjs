import fs from 'node:fs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const files = ['.env', '.env.local'];

function parseFile(file) {
  if (!fs.existsSync(file)) return { file, exists: false, values: {} };
  return { file, exists: true, values: dotenv.parse(fs.readFileSync(file, 'utf8')) };
}

function describe(value) {
  if (!value) return { present: false };
  try {
    const parsed = new URL(value);
    return {
      present: true,
      host: parsed.hostname,
      port: parsed.port || '5432',
      database: parsed.pathname.replace(/^\//, '') || null,
      scheme: parsed.protocol.replace(':', '')
    };
  } catch {
    return { present: true, validUrl: false };
  }
}

async function testConnection(label, value) {
  if (!value) return { label, attempted: false, status: 'MISSING' };
  const prisma = new PrismaClient({ datasources: { db: { url: value } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { label, attempted: true, status: 'CONNECTED' };
  } catch (error) {
    return {
      label,
      attempted: true,
      status: 'FAILED',
      error: error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, '[redacted-url]') : String(error)
    };
  } finally {
    await prisma.$disconnect();
  }
}

const sources = files.map(parseFile);
const report = {
  nodeEnv: process.env.NODE_ENV ?? null,
  sources: sources.map(({ file, exists, values }) => ({
    file,
    exists,
    databaseUrl: describe(values.DATABASE_URL),
    directUrl: describe(values.DIRECT_URL)
  })),
  shell: {
    databaseUrl: describe(process.env.DATABASE_URL),
    directUrl: describe(process.env.DIRECT_URL)
  }
};

const connectionTests = [];
for (const { file, values } of sources) {
  connectionTests.push(await testConnection(`${file}:DATABASE_URL`, values.DATABASE_URL));
  connectionTests.push(await testConnection(`${file}:DIRECT_URL`, values.DIRECT_URL));
}
connectionTests.push(await testConnection('shell:DATABASE_URL', process.env.DATABASE_URL));
connectionTests.push(await testConnection('shell:DIRECT_URL', process.env.DIRECT_URL));

console.log(JSON.stringify({ report, connectionTests }, null, 2));
