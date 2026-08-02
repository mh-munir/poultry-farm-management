import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  const res = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'SmsNotification'
    ORDER BY ordinal_position;
  `);
  console.log(JSON.stringify(res.rows, null, 2));
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
