CREATE TABLE "SuperAdminTransfer" (
  "id" TEXT NOT NULL,
  "initiatedByUserId" TEXT NOT NULL,
  "previousSuperAdminId" TEXT NOT NULL,
  "newSuperAdminId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CURRENT_OTP_PENDING',
  "currentOtpHash" TEXT,
  "currentOtpExpiresAt" TIMESTAMP(3),
  "currentOtpAttempts" INTEGER NOT NULL DEFAULT 0,
  "currentOtpResendAt" TIMESTAMP(3),
  "currentVerifiedAt" TIMESTAMP(3),
  "newOtpHash" TEXT,
  "newOtpExpiresAt" TIMESTAMP(3),
  "newOtpAttempts" INTEGER NOT NULL DEFAULT 0,
  "newOtpResendAt" TIMESTAMP(3),
  "newVerifiedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SuperAdminTransfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SuperAdminTransfer_status_createdAt_idx" ON "SuperAdminTransfer"("status", "createdAt");
CREATE INDEX "SuperAdminTransfer_previousSuperAdminId_status_idx" ON "SuperAdminTransfer"("previousSuperAdminId", "status");
CREATE INDEX "SuperAdminTransfer_newSuperAdminId_idx" ON "SuperAdminTransfer"("newSuperAdminId");
ALTER TABLE "SuperAdminTransfer" ADD CONSTRAINT "SuperAdminTransfer_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SuperAdminTransfer" ADD CONSTRAINT "SuperAdminTransfer_previousSuperAdminId_fkey" FOREIGN KEY ("previousSuperAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SuperAdminTransfer" ADD CONSTRAINT "SuperAdminTransfer_newSuperAdminId_fkey" FOREIGN KEY ("newSuperAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
