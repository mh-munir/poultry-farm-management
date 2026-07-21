Migration Playbook: SQLite → Supabase Postgres (Vercel-ready)

Prerequisites
- Have a Supabase project and Postgres connection strings (pooled/runtime `DATABASE_URL` and primary `DIRECT_URL`).
- Keep `.env.local` out of version control and populated with the Supabase URLs.
- Backup your SQLite DB: `prisma/dev.db` (we created `prisma/dev.db.bak`).

High-level steps
1. Backup
   - Copy `prisma/dev.db` to `prisma/dev.db.bak` (already done).
2. Ensure Prisma loads `.env.local` locally
   - Use the included npm scripts that set `DOTENV_CONFIG_PATH=.env.local` via `cross-env`.
   - Commands:
     - `npm run prisma:validate:local`
     - `npm run prisma:generate:local`
     - `npm run prisma:push:local` (applies schema; may be destructive)
3. Dry-run / Preview
   - Use `npm run prisma:validate:local` and `node -r dotenv/config scripts/test-pg.mjs DATABASE_URL` to verify connectivity.
4. Migrate schema
   - Run `npm run prisma:push:local` to sync Prisma schema to Postgres.
   - If you prefer a migration-based approach for production: create SQL migrations against your Postgres DB using `prisma migrate dev --create-only` then review.
5. Migrate data (recommended approach)
   - Option A: Use `prisma db pull` + a custom ETL script to copy rows from SQLite to Postgres using Node and Prisma clients.
   - Option B: Use `pgloader` or `sqlite3` + `psql` pipeline to bulk copy tables (test on a snapshot first).
   - Steps for simple data copy via Node:
     1. `npm run prisma:generate` (for both SQLite and Postgres contexts — use DOTENV_CONFIG_PATH to switch envs).
     2. Write a small script that reads from SQLite Prisma Client (pointing to `file:./prisma/dev.db`) and writes into Postgres Prisma Client (pointing to your Supabase URL).
6. Verify
   - Run application locally pointing to Postgres (via `.env.local`) and exercise user flows.
   - Check data consistency, counts, and referential integrity.
7. Vercel deployment
   - In Vercel dashboard, set `DATABASE_URL` and `DIRECT_URL` as Environment Variables (Production environment).
   - Use `prisma migrate deploy` during your deployment pipeline to apply migrations in production (if using migration files).

Safety notes
- Do not run destructive commands against production without backups.
- Keep `.env.local` secret and excluded from git.
- Test migrations on a staging Supabase project before production.

If you want, I can generate a small Node ETL script to copy your data from SQLite to Postgres as a dry-run next.
