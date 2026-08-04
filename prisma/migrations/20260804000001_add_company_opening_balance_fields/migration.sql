-- AlterTable
ALTER TABLE "Company"
ADD COLUMN "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "openingBalanceDescription" TEXT;
