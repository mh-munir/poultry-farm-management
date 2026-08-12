import 'dotenv/config';
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
const { Client } = pkg;
const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!url) {
  throw new Error('NO_DATABASE_URL');
}
const safeUrl = url.replace(/(:\/\/[^:@]+)(:[^:@]+)?@/, '$1@').replace(/([?&]password=)[^&]+/, '$1<redacted>');
const outFile = path.resolve('tmp', 'readonly-db-check-output.json');
const client = new Client({ connectionString: url });
await client.connect();
try {
  const countsRes = await client.query('SELECT role, COUNT(*)::int AS count FROM "User" GROUP BY role ORDER BY role');
  const counts = Object.fromEntries(countsRes.rows.map((row) => [row.role, row.count]));
  const userRes = await client.query('SELECT id FROM "User" WHERE email = $1 LIMIT 1', ['admin@poultryfarm.test']);
  fs.writeFileSync(outFile, JSON.stringify({ host: new URL(url).host, database: new URL(url).pathname.replace(/^\//, ''), safeUrl, roleCounts: counts, adminUserExists: userRes.rowCount > 0 }, null, 2), 'utf8');
} finally {
  await client.end();
}
