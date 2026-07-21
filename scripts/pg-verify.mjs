import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });
const outDir = path.resolve('tmp');
const outPath = path.join(outDir, 'pg-verification.json');
const report = {
  connection: { status: null, errorCategory: null },
  tables: [],
  migrationTablePresent: false,
  rowCounts: {},
  prismaValidate: { success: false, output: null },
  prismaGenerate: { success: false, output: null },
  schemaDiff: { success: false, sql: null, error: null },
  synchronized: null,
  warnings: []
};
 (async () => {
  try {
    if (!process.env.DATABASE_URL) {
      report.connection.status = 'MISSING_DATABASE_URL';
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
      process.exit(1);
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL, statement_timeout: 15000 });
    try {
      await client.connect();
      report.connection.status = 'OK';
    } catch (e) {
      const m = (e.message || '').toLowerCase();
      if (m.includes('password authentication failed') || m.includes('authentication failed')) report.connection.errorCategory = 'AUTHENTICATION_ERROR';
      else if (m.includes('getaddrinfo') || m.includes('could not translate host name') || m.includes('getaddrinfo')) report.connection.errorCategory = 'DNS_ERROR';
      else if (m.includes('connect') || m.includes('connection refused')) report.connection.errorCategory = 'CONNECTION_ERROR';
      else report.connection.errorCategory = 'UNKNOWN_CONNECTION_ERROR';
      report.connection.status = 'FAILED';
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
      process.exit(1);
    }

    // list tables
    const tblRes = await client.query("select tablename from pg_tables where schemaname='public' order by tablename");
    report.tables = tblRes.rows.map(r => r.tablename);

    // check migration table
    const migrationNames = ['_prisma_migrations', 'prisma_migrations'];
    report.migrationTablePresent = report.tables.some(t => migrationNames.includes(t));

    // row counts for each non-system application table
    for (const t of report.tables) {
      try {
        if (migrationNames.includes(t)) { report.rowCounts[t] = null; continue; }
        const qc = await client.query({ text: `select count(*)::bigint as cnt from "${t}"` });
        report.rowCounts[t] = Number(qc.rows[0].cnt || 0);
      } catch (e) {
        report.rowCounts[t] = null;
        report.warnings.push(`COUNT_ERROR:${t}`);
      }
    }

    // prisma validate
    try {
      process.env.DOTENV_CONFIG_PATH = '.env.local';
      execSync('node -r dotenv/config ./node_modules/.bin/prisma validate --schema=prisma/schema.prisma', { encoding: 'utf8', stdio: ['pipe','pipe','pipe'], timeout: 20000 });
      report.prismaValidate.success = true;
      report.prismaValidate.output = 'VALID';
    } catch (e) {
      report.prismaValidate.success = false;
      report.prismaValidate.output = (e.stderr || e.stdout || String(e.message)).toString().slice(0,2000);
    }

    // prisma generate
    try {
      execSync('node -r dotenv/config ./node_modules/.bin/prisma generate --schema=prisma/schema.prisma', { encoding: 'utf8', stdio: ['pipe','pipe','pipe'], timeout: 60000 });
      report.prismaGenerate.success = true;
      report.prismaGenerate.output = 'GENERATED';
    } catch (e) {
      report.prismaGenerate.success = false;
      report.prismaGenerate.output = (e.stderr || e.stdout || String(e.message)).toString().slice(0,2000);
    }

    // schema plan preview (read-only) using prisma db push --print
    try {
      const planCmd = 'node -r dotenv/config ./node_modules/.bin/prisma db push --schema=prisma/schema.prisma --print';
      const planOut = execSync(planCmd, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'], timeout: 30000 });
      report.schemaDiff.success = true;
      report.schemaDiff.sql = planOut.toString();
      report.schemaDiff.error = null;
      report.synchronized = report.schemaDiff.sql.trim() === '';
      if (!report.synchronized) report.warnings.push('SCHEMA_PLAN_NEEDS_APPLY');
    } catch (e) {
      report.schemaDiff.success = false;
      const txt = (e.stderr || e.stdout || String(e.message)).toString();
      report.schemaDiff.error = txt.slice(0,5000);
      report.synchronized = null;
    }

    await client.end();

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (err) {
    try { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(outPath, JSON.stringify({ error: 'UNEXPECTED_ERROR', message: String(err).slice(0,2000) }, null, 2)); } catch (e) {}
    process.exit(1);
  }
})();
