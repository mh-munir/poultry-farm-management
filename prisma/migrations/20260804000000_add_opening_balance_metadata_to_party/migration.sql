-- Add opening balance metadata to Party for the customer opening-balance feature
ALTER TABLE "Party"
  ADD COLUMN "openingBalanceType" TEXT NOT NULL DEFAULT 'CUSTOMER_DUE',
  ADD COLUMN "openingBalanceDescription" TEXT;

UPDATE "Party"
SET "openingBalanceType" = CASE
  WHEN "openingBalance" < 0 THEN 'CUSTOMER_ADVANCE'
  ELSE 'CUSTOMER_DUE'
END;

CREATE INDEX "Party_openingBalanceType_idx"
ON "Party"("openingBalanceType");
