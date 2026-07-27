-- CreateTable
CREATE TABLE "Cost" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "costDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Cost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cost_costDate_idx" ON "Cost"("costDate");

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
