-- Add companyId to SmsNotification for party/company SMS targeting
ALTER TABLE "SmsNotification" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SmsNotification_companyId_fkey'
  ) THEN
    ALTER TABLE "SmsNotification"
    ADD CONSTRAINT "SmsNotification_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SmsNotification_companyId_createdAt_idx"
ON "SmsNotification"("companyId", "createdAt");
