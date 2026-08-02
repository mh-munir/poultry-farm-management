import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const results = {};
results.migrations = (await client.query('SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at')).rows;
results.smsNotificationColumns = (await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'SmsNotification' ORDER BY ordinal_position")).rows;
results.expenseColumns = (await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'Expense' ORDER BY ordinal_position")).rows;
results.partyColumns = (await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'Party' ORDER BY ordinal_position")).rows;
results.partyUniqueConstraints = (await client.query("SELECT conname, pg_get_constraintdef(oid) as definition FROM pg_constraint WHERE conrelid = 'public.\"Party\"'::regclass AND contype = 'u' ORDER BY conname")).rows;
results.smsNotificationConstraints = (await client.query("SELECT conname, pg_get_constraintdef(oid) as definition FROM pg_constraint WHERE conrelid = 'public.\"SmsNotification\"'::regclass ORDER BY conname")).rows;
results.partyIndexes = (await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='Party' ORDER BY indexname")).rows;
results.smsNotificationIndexes = (await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='SmsNotification' ORDER BY indexname")).rows;

fs.writeFileSync('tmp/db-inspect.json', JSON.stringify(results, null, 2));

await client.end();
