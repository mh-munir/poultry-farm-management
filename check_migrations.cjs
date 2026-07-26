const { Client } = require('pg');
const url = process.env.DATABASE_URL || 'postgresql://postgres.otihxpdewynpxxykokfy:islamabadfeddsandmedicin@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
client.connect().then(async () => {
  const res = await client.query("SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5");
  console.log('Migration records:', JSON.stringify(res.rows, null, 2));
  await client.end();
}).catch(e => { console.error('Error:', e.message); process.exit(1); });
