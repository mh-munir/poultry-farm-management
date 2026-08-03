import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const files = ['.env', '.env.local', 'prisma/.env'];
const report = { files: {}, shell: {}, prismaCli: {} };
for (const file of files) {
  const filePath = path.resolve(file);
  report.files[file] = { exists: fs.existsSync(filePath) };
  if (report.files[file].exists) {
    const parsed = dotenv.parse(fs.readFileSync(filePath, 'utf8'));
    report.files[file].DATABASE_URL = parsed.DATABASE_URL ? { masked: true, scheme: parsed.DATABASE_URL.split(':')[0] } : null;
    report.files[file].DIRECT_URL = parsed.DIRECT_URL ? { masked: true, scheme: parsed.DIRECT_URL.split(':')[0] } : null;
  }
}
report.shell.DOTENV_CONFIG_PATH = process.env.DOTENV_CONFIG_PATH || null;
report.shell.DATABASE_URL = process.env.DATABASE_URL ? { masked: true, scheme: process.env.DATABASE_URL.split(':')[0] } : null;

const outDir = path.resolve('debug', 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'env-debug.json'), JSON.stringify(report, null, 2));
console.log('debug/reports/env-debug.json written');
