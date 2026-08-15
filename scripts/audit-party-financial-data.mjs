import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function query(sql) {
  return prisma.$queryRawUnsafe(sql);
}

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    companies: await query(`
      SELECT "id", "name", "isActive", "companyType"
      FROM "Company"
      ORDER BY "id"
    `),
    recordCounts: await query(`
      SELECT
        (SELECT COUNT(*) FROM "Party")::int AS "parties",
        (SELECT COUNT(*) FROM "Transaction" WHERE "partyId" IS NOT NULL)::int AS "partyTransactions",
        (SELECT COUNT(*) FROM "Payment" WHERE "partyId" IS NOT NULL)::int AS "partyPayments",
        (SELECT COUNT(*) FROM "LedgerEntry" WHERE "partyId" IS NOT NULL)::int AS "partyLedgerEntries"
    `),
    partyCompanyRelationships: await query(`
      WITH relationships AS (
        SELECT "partyId", "companyId" FROM "Transaction" WHERE "partyId" IS NOT NULL
        UNION
        SELECT "partyId", "companyId" FROM "Payment" WHERE "partyId" IS NOT NULL
        UNION
        SELECT "partyId", "companyId" FROM "LedgerEntry" WHERE "partyId" IS NOT NULL
      )
      SELECT
        "partyId",
        ARRAY_AGG(DISTINCT COALESCE("companyId", -1) ORDER BY COALESCE("companyId", -1)) AS "companyKeys",
        COUNT(DISTINCT COALESCE("companyId", -1))::int AS "companyKeyCount"
      FROM relationships
      GROUP BY "partyId"
      ORDER BY "partyId"
    `),
    conflictingPartyCompanies: await query(`
      WITH relationships AS (
        SELECT "partyId", "companyId" FROM "Transaction" WHERE "partyId" IS NOT NULL
        UNION
        SELECT "partyId", "companyId" FROM "Payment" WHERE "partyId" IS NOT NULL
        UNION
        SELECT "partyId", "companyId" FROM "LedgerEntry" WHERE "partyId" IS NOT NULL
      )
      SELECT
        "partyId",
        ARRAY_AGG(DISTINCT COALESCE("companyId", -1) ORDER BY COALESCE("companyId", -1)) AS "companyKeys"
      FROM relationships
      GROUP BY "partyId"
      HAVING COUNT(DISTINCT COALESCE("companyId", -1)) > 1
      ORDER BY "partyId"
    `),
    paymentDirectionClassification: await query(`
      WITH payment_directions AS (
        SELECT
          p."id",
          p."partyId",
          p."status",
          p."companyId",
          p."amount",
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE
            WHEN l."entryType" = 'PAYMENT_RECEIVED' THEN 'CUSTOMER_PAYMENT'
            WHEN l."entryType" = 'PAYMENT_PAID' THEN 'SUPPLIER_PAYMENT'
          END), NULL) AS "directions"
        FROM "Payment" p
        LEFT JOIN "LedgerEntry" l ON l."paymentId" = p."id"
        WHERE p."partyId" IS NOT NULL
        GROUP BY p."id", p."partyId", p."status", p."companyId", p."amount"
      )
      SELECT
        "id" AS "paymentId",
        "partyId",
        "status",
        "companyId",
        "amount",
        "directions",
        CASE
          WHEN CARDINALITY("directions") = 1 THEN "directions"[1]
          WHEN CARDINALITY("directions") = 0 THEN 'AMBIGUOUS'
          ELSE 'CONFLICTING'
        END AS "classification"
      FROM payment_directions
      ORDER BY "id"
    `),
    transactionStatuses: await query(`
      SELECT "transactionType", "status", COUNT(*)::int AS "count"
      FROM "Transaction"
      WHERE "partyId" IS NOT NULL
      GROUP BY "transactionType", "status"
      ORDER BY "transactionType", "status"
    `),
    paymentStatuses: await query(`
      SELECT "status", COUNT(*)::int AS "count"
      FROM "Payment"
      WHERE "partyId" IS NOT NULL
      GROUP BY "status"
      ORDER BY "status"
    `),
    openingBalances: await query(`
      SELECT "id" AS "partyId", "openingBalance", "openingBalanceType"
      FROM "Party"
      WHERE "openingBalance" <> 0
      ORDER BY "id"
    `),
    ledgerPaymentConsistency: await query(`
      SELECT
        p."id" AS "paymentId",
        p."amount" AS "paymentAmount",
        COALESCE(SUM(CASE WHEN l."entryType" IN ('PAYMENT_RECEIVED', 'PAYMENT_PAID') THEN -l."amount" ELSE 0 END), 0) AS "activeLedgerPaymentAmount"
      FROM "Payment" p
      LEFT JOIN "LedgerEntry" l ON l."paymentId" = p."id"
      WHERE p."partyId" IS NOT NULL
      GROUP BY p."id", p."amount"
      HAVING COALESCE(SUM(CASE WHEN l."entryType" IN ('PAYMENT_RECEIVED', 'PAYMENT_PAID') THEN -l."amount" ELSE 0 END), 0) <> p."amount"
      ORDER BY p."id"
    `)
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .finally(async () => prisma.$disconnect());
