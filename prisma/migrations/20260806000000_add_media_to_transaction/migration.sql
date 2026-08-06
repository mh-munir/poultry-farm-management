-- Add mediaName to Transaction
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "mediaName" TEXT NOT NULL DEFAULT '';
