-- Manual migration: add Setting and Cost tables
-- Apply this SQL to your Postgres database when ready (e.g. via psql or prisma migrate deploy)

CREATE TABLE IF NOT EXISTS "Setting" (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedById" TEXT,
  CONSTRAINT fk_setting_updatedBy FOREIGN KEY ("updatedById") REFERENCES "User"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Setting_key_idx" ON "Setting"(key);

CREATE TABLE IF NOT EXISTS "Cost" (
  id SERIAL PRIMARY KEY,
  amount NUMERIC NOT NULL,
  description TEXT,
  "costDate" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdById" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_cost_createdBy FOREIGN KEY ("createdById") REFERENCES "User"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Cost_costDate_idx" ON "Cost"("costDate");
