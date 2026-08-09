-- Fix CASCADE delete relationships to RESTRICT for better data safety and audit trail preservation

-- 1. StockBalance -> Product: CASCADE to RESTRICT
ALTER TABLE "StockBalance" DROP CONSTRAINT "StockBalance_productId_fkey";
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. StockMovement -> Product: CASCADE to RESTRICT  
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_productId_fkey";
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. PaymentAllocation -> Transaction: CASCADE to RESTRICT
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT "PaymentAllocation_transactionId_fkey";
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. DueAdjustment -> Transaction: CASCADE to RESTRICT
ALTER TABLE "DueAdjustment" DROP CONSTRAINT "DueAdjustment_transactionId_fkey";
ALTER TABLE "DueAdjustment" ADD CONSTRAINT "DueAdjustment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
