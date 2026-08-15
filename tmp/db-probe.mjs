import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env');
const raw = fs.readFileSync(envPath, 'utf8');
const match = raw.match(/DATABASE_URL\s*=\s*"?([^\r\n" ]+)/);

if (!match) {
  console.log('ENV_FILE_NO_DATABASE_URL');
  process.exit(1);
}

const url = match[1];
console.log('MASKED_URL=' + url.replace(/(:\/\/)([^:]+):([^@]+)@/, '$1$2:***@'));

const { Client } = await import('pg');
const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('RAW_PG_CONNECTED');
  const res = await client.query('SELECT 1 as ok, current_database() as db, current_user as usr');
  console.log('RAW_PG_SELECT=' + JSON.stringify(res.rows[0]));
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : 'unknown';
  console.error('RAW_PG_ERROR=' + message);
  console.error('RAW_PG_CODE=' + code);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
