import fs from 'node:fs';

const reportPath = 'tmp/final-runtime-proof-output.txt';
const lines = [];

lines.push('START');
lines.push('DATABASE_URL exists in .env = ' + (fs.existsSync('.env') && /DATABASE_URL\s*=/.test(fs.readFileSync('.env', 'utf8')) ? 'YES' : 'NO'));
const envText = fs.readFileSync('.env', 'utf8');
const envMatch = envText.match(/DATABASE_URL\s*=\s*"?([^\r\n" ]+)/);
if (envMatch) {
  const url = envMatch[1];
  try {
    const parsed = new URL(url);
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
try {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL || envMatch?.[1] } } });
  const result = await prisma.$queryRaw`SELECT 1 as ok`;
  lines.push('PRISMA_SELECT_1 = ' + JSON.stringify(result[0]));
  await prisma.$disconnect();
} catch (error) {
  lines.push('PRISMA_ERROR = ' + (error instanceof Error ? error.message : String(error)));
  fs.writeFileSync(reportPath, lines.join('\n'));
  process.exitCode = 1;
  process.exit();
}
lines.push('END');
fs.writeFileSync(reportPath, lines.join('\n'));
