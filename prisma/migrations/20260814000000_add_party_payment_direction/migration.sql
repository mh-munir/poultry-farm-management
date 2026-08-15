ALTER TABLE "Payment" ADD COLUMN "paymentDirection" TEXT;

UPDATE "Payment" p
SET "paymentDirection" = classified."paymentDirection"
FROM (
  SELECT
    l."paymentId",
    CASE
      WHEN COUNT(DISTINCT l."entryType") FILTER (WHERE l."entryType" = 'PAYMENT_RECEIVED') > 0
        AND COUNT(DISTINCT l."entryType") FILTER (WHERE l."entryType" = 'PAYMENT_PAID') = 0
        THEN 'CUSTOMER_PAYMENT'
      WHEN COUNT(DISTINCT l."entryType") FILTER (WHERE l."entryType" = 'PAYMENT_PAID') > 0
        AND COUNT(DISTINCT l."entryType") FILTER (WHERE l."entryType" = 'PAYMENT_RECEIVED') = 0
        THEN 'SUPPLIER_PAYMENT'
      ELSE NULL
    END AS "paymentDirection"
  FROM "LedgerEntry" l
  WHERE l."paymentId" IS NOT NULL
  GROUP BY l."paymentId"
) classified
WHERE p."id" = classified."paymentId"
  AND classified."paymentDirection" IS NOT NULL;

CREATE INDEX "Payment_partyId_paymentDirection_paymentDate_idx"
ON "Payment"("partyId", "paymentDirection", "paymentDate");
