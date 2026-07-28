-- CreateTable
CREATE TABLE "AdminCreationOtp" (
    "id" TEXT NOT NULL,
    "superAdminId" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "deliveryMethod" TEXT NOT NULL DEFAULT 'EMAIL',
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "resendCooldown" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminCreationOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminCreationOtp_contact_key" ON "AdminCreationOtp"("contact");

-- CreateIndex
CREATE INDEX "AdminCreationOtp_contact_idx" ON "AdminCreationOtp"("contact");

-- AddForeignKey
ALTER TABLE "AdminCreationOtp" ADD CONSTRAINT "AdminCreationOtp_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
