-- Create Company table
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "companyType" TEXT NOT NULL DEFAULT 'FEED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Company.name
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- Create index on Company.name
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- Migrate existing COMPANY-type parties to Companies
INSERT INTO "Company" ("name", "contactPerson", "phone", "email", "address", "companyType", "isActive", "createdAt", "updatedAt", "createdById")
SELECT "name", NULL, "phone", "email", "address", 'FEED', "isActive", "createdAt", "updatedAt", "createdById"
FROM "Party"
WHERE "partyType" = 'COMPANY';

-- Add companyId to Product
ALTER TABLE "Product" ADD COLUMN "companyId" INTEGER;

-- Add companyId to Transaction and make partyId nullable
ALTER TABLE "Transaction" ADD COLUMN "companyId" INTEGER;
ALTER TABLE "Transaction" ALTER COLUMN "partyId" DROP NOT NULL;

-- Add companyId to Payment and make partyId nullable
ALTER TABLE "Payment" ADD COLUMN "companyId" INTEGER;
ALTER TABLE "Payment" ALTER COLUMN "partyId" DROP NOT NULL;

-- Add companyId to LedgerEntry
ALTER TABLE "LedgerEntry" ADD COLUMN "companyId" INTEGER;

-- Add companyId to DueAdjustment and make partyId nullable
ALTER TABLE "DueAdjustment" ADD COLUMN "companyId" INTEGER;
ALTER TABLE "DueAdjustment" ALTER COLUMN "partyId" DROP NOT NULL;

-- Remove feed/medicine fields from Party
ALTER TABLE "Party" DROP COLUMN "feedQuantity";
ALTER TABLE "Party" DROP COLUMN "feedPrice";
ALTER TABLE "Party" DROP COLUMN "feedName";
ALTER TABLE "Party" DROP COLUMN "medicineName";
ALTER TABLE "Party" DROP COLUMN "medicineQuantity";
ALTER TABLE "Party" DROP COLUMN "medicinePrice";

-- Add foreign keys
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DueAdjustment" ADD CONSTRAINT "DueAdjustment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");
CREATE INDEX "Transaction_companyId_transactionDate_idx" ON "Transaction"("companyId", "transactionDate");
CREATE INDEX "Payment_companyId_paymentDate_idx" ON "Payment"("companyId", "paymentDate");
CREATE INDEX "LedgerEntry_companyId_entryDate_idx" ON "LedgerEntry"("companyId", "entryDate");
CREATE INDEX "DueAdjustment_companyId_idx" ON "DueAdjustment"("companyId");

-- Migrate feed/medicine products to companies based on purchase transactions
UPDATE "Product" p
SET "companyId" = (
    SELECT c."id"
    FROM "Company" c
    JOIN "Transaction" t ON t."partyId" = (SELECT "id" FROM "Party" WHERE "name" = c."name" LIMIT 1)
    JOIN "TransactionItem" ti ON ti."transactionId" = t."id"
    WHERE ti."productId" = p."id"
      AND t."transactionType" = 'PURCHASE'
      AND p."productType" IN ('FEED', 'MEDICINE')
    ORDER BY t."transactionDate" DESC
    LIMIT 1
)
WHERE p."productType" IN ('FEED', 'MEDICINE')
  AND EXISTS (
    SELECT 1
    FROM "Transaction" t
    JOIN "TransactionItem" ti ON ti."transactionId" = t."id"
    WHERE ti."productId" = p."id"
      AND t."transactionType" = 'PURCHASE'
  );

-- Update feed/medicine purchase transactions to use companyId
UPDATE "Transaction" t
SET "companyId" = (
    SELECT p."companyId"
    FROM "Product" p
    JOIN "TransactionItem" ti ON ti."productId" = p."id"
    WHERE ti."transactionId" = t."id"
      AND p."productType" IN ('FEED', 'MEDICINE')
    LIMIT 1
)
WHERE t."transactionType" = 'PURCHASE'
  AND EXISTS (
    SELECT 1
    FROM "TransactionItem" ti
    JOIN "Product" p ON p."id" = ti."productId"
    WHERE ti."transactionId" = t."id"
      AND p."productType" IN ('FEED', 'MEDICINE')
  );

-- Clear partyId for company transactions (keep only for poultry transactions)
UPDATE "Transaction" t
SET "partyId" = NULL
WHERE t."companyId" IS NOT NULL;

-- Update payments for company transactions
UPDATE "Payment" p
SET "companyId" = (
    SELECT t."companyId"
    FROM "Transaction" t
    JOIN "PaymentAllocation" pa ON pa."transactionId" = t."id"
    WHERE pa."paymentId" = p."id"
      AND t."companyId" IS NOT NULL
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM "PaymentAllocation" pa
    JOIN "Transaction" t ON t."id" = pa."transactionId"
    WHERE pa."paymentId" = p."id"
      AND t."companyId" IS NOT NULL
);

-- Clear partyId for company payments
UPDATE "Payment" p
SET "partyId" = NULL
WHERE p."companyId" IS NOT NULL;

-- Update ledger entries for company transactions
UPDATE "LedgerEntry" le
SET "companyId" = (
    SELECT t."companyId"
    FROM "Transaction" t
    WHERE t."id" = le."transactionId"
      AND t."companyId" IS NOT NULL
    LIMIT 1
)
WHERE le."transactionId" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "Transaction" t
    WHERE t."id" = le."transactionId"
      AND t."companyId" IS NOT NULL
  );

-- Update ledger entries for company payments
UPDATE "LedgerEntry" le
SET "companyId" = (
    SELECT p."companyId"
    FROM "Payment" p
    WHERE p."id" = le."paymentId"
      AND p."companyId" IS NOT NULL
    LIMIT 1
)
WHERE le."paymentId" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "Payment" p
    WHERE p."id" = le."paymentId"
      AND p."companyId" IS NOT NULL
  );

-- Clear partyId for company ledger entries
UPDATE "LedgerEntry" le
SET "partyId" = NULL
WHERE le."companyId" IS NOT NULL;
