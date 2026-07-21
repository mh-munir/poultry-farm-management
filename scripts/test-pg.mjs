#!/usr/bin/env node
import pg from 'pg';

// Usage: DOTENV_CONFIG_PATH=.env.local node -r dotenv/config scripts/test-pg.mjs DATABASE_URL
// Default var: DATABASE_URL
const varName = process.argv[2] || 'DATABASE_URL';
const conn = process.env[varName];

if (!conn) {
  console.error(`MISSING:${varName}`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: conn });

function mapError(e) {
  const msg = (e && e.message || '').toLowerCase();
  const code = e && e.code;

  if (code === 'ENOTFOUND' || msg.includes('getaddrinfo') || msg.includes('could not translate host name')) {
    return ['DNS_ERROR','Could not resolve database host.'];
  }
  if (code === 'ECONNREFUSED' || msg.includes('connection refused')) {
    return ['CONNECTION_REFUSED','Connection was refused by the server.'];
  }
  if (code === 'ETIMEDOUT' || msg.includes('timeout')) {
    return ['TIMEOUT','Connection attempt timed out.'];
  }
  if (msg.includes('self signed certificate') || msg.includes('ssl')) {
    return ['SSL_ERROR','TLS/SSL error connecting to the database.'];
  }
  if (code === '28P01' || msg.includes('password authentication failed') || msg.includes('authentication failed')) {
    return ['AUTHENTICATION_ERROR','Authentication failed for the given credentials.'];
  }
  if (msg.includes('invalid connection string') || msg.includes('invalid input syntax for type') || code === 'EINVAL') {
    return ['INVALID_CONNECTION_STRING','Connection string appears invalid.'];
  }
  if (msg.includes('does not exist') || msg.includes('database "') && msg.includes('does not exist')) {
    return ['DATABASE_NOT_FOUND','Target database was not found.'];
  }
  return ['UNKNOWN_CONNECTION_ERROR','An unknown error occurred while connecting.'];
}

(async () => {
  try {
    await client.connect();
    await client.query('SELECT 1');
    console.log(`OK:${varName}`);
    await client.end();
    process.exit(0);
  } catch (e) {
    try { await client.end(); } catch (_) {}
    const [code, human] = mapError(e);
    console.log(`${code} ${human}`);
    process.exit(1);
  }
})();
