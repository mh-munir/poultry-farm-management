import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

const outDir = path.resolve('tmp');
const outPath = path.join(outDir, 'prisma-env-debug.json');
const report = { loaded: {}, cli: {}, prismaPrint: null, errors: [] };

const envLocalPath = path.resolve('.env.local');
if (fs.existsSync(envLocalPath)) {
  const parsed = dotenv.parse(fs.readFileSync(envLocalPath, 'utf8'));
  report.loaded['.env.local'] = {
    exists: true,
    DATABASE_URL: parsed.DATABASE_URL ? { masked: true, scheme: parsed.DATABASE_URL.split(':')[0] } : null,
    DIRECT_URL: parsed.DIRECT_URL ? { masked: true, scheme: parsed.DIRECT_URL.split(':')[0] } : null
  };
} else {
  report.loaded['.env.local'] = { exists: false };
}

report.cli.prismaBin = './node_modules/.bin/prisma';
report.cli.command = 'node -r dotenv/config ./node_modules/.bin/prisma db push --schema=prisma/schema.prisma --print';
report.cli.env = { DOTENV_CONFIG_PATH: '.env.local' };

try {
  const stdout = execSync(report.cli.command, { env: { ...process.env, DOTENV_CONFIG_PATH: '.env.local' }, encoding: 'utf8', stdio: ['pipe','pipe','pipe'], timeout: 30000 });
  report.prismaPrint = { success: true, output: stdout.slice(0,20000) };
} catch (e) {
  report.prismaPrint = { success: false, output: (e.stdout || e.stderr || String(e.message)).toString().slice(0,20000) };
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('wrote tmp/prisma-env-debug.json');
