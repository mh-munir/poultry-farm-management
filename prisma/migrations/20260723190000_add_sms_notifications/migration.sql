-- CreateEnum
CREATE TYPE "SmsNotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "SmsNotification" (
    "id" SERIAL NOT NULL,
    "partyId" INTEGER NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "phoneNumber" TEXT,
    "saleType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SmsNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsNotification_transactionId_key" ON "SmsNotification"("transactionId");

-- CreateIndex
CREATE INDEX "SmsNotification_partyId_createdAt_idx" ON "SmsNotification"("partyId", "createdAt");

-- CreateIndex
CREATE INDEX "SmsNotification_status_createdAt_idx" ON "SmsNotification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SmsNotification_saleType_createdAt_idx" ON "SmsNotification"("saleType", "createdAt");

-- AddForeignKey
ALTER TABLE "SmsNotification" ADD CONSTRAINT "SmsNotification_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsNotification" ADD CONSTRAINT "SmsNotification_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
