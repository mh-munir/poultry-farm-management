import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const files = ['.env', '.env.local', 'prisma/.env'];
const out = {};
for (const file of files) {
  const filePath = path.resolve(file);
  out[file] = { exists: fs.existsSync(filePath) };
  if (out[file].exists) {
    const parsed = dotenv.parse(fs.readFileSync(filePath, 'utf8'));
    out[file].DATABASE_URL = parsed.DATABASE_URL ? 'MASKED' : null;
  }
}
const shellUrl = process.env.DATABASE_URL ? 'MASKED' : null;
out.shell = { DATABASE_URL: shellUrl, DOTENV_CONFIG_PATH: process.env.DOTENV_CONFIG_PATH || null };
const outDir = path.resolve('debug', 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'env-inspect.json'), JSON.stringify(out, null, 2));
console.log('wrote debug/reports/env-inspect.json');
