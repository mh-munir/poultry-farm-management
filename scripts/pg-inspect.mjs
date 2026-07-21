import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local' });
const outPath = path.resolve('tmp', 'pg-inspect.json');
try {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({ error: 'MISSING_DATABASE_URL' }));
    process.exit(1);
  }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const tablesRes = await client.query("select tablename from pg_tables where schemaname='public' order by tablename");
  const tables = tablesRes.rows.map(r => r.tablename);
  const migrationsRes = await client.query("select tablename from pg_tables where schemaname='public' and tablename in ('_prisma_migrations','prisma_migrations')");
  const migrationTables = migrationsRes.rows.map(r => r.tablename);
  const report = { tables, migrationTables };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  await client.end();
  process.exit(0);
} catch (err) {
  try { fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, JSON.stringify({ error: 'INSPECT_ERROR' })); } catch (e) {}
  process.exit(1);
}
