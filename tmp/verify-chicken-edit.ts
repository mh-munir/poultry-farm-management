/// <reference types="node" />

import { Prisma } from '@prisma/client';
import { prisma } from '../src/server/db';
import { getPartyFinancialSummary } from '../src/features/parties/accounting';

async function main() {
  const item = await prisma.transactionItem.findFirst({
    where: {
      product: { productType: 'CHICKEN' },
      chickenQuantity: { not: null },
      quantity: { gt: 0 }
    },
    include: {
      product: true,
      transaction: {
        include: {
          party: true,
          company: true,
          ledgerEntries: true
        }
      }
    },
    orderBy: { id: 'asc' }
  });

  if (!item) {
    console.log('NO Chicken purchase item found.');
    return;
  }

  const original = {
    itemId: item.id,
    transactionId: item.transactionId,
    partyId: item.transaction.partyId,
    companyId: item.transaction.companyId,
    quantity: item.quantity.toString(),
    totalKg: item.chickenQuantity?.toString() ?? '0',
    unitPrice: item.unitPrice.toString(),
    lineTotal: item.lineTotal.toString(),
    subtotal: item.transaction.subtotal.toString(),
    discount: item.transaction.discount.toString(),
    total: item.transaction.totalAmount.toString(),
    paidAmount: item.transaction.paidAmount.toString(),
    dueAmount: item.transaction.dueAmount.toString(),
  };

  console.log('BEFORE', JSON.stringify(original, null, 2));

  const paymentAllocations = await prisma.paymentAllocation.findMany({
    where: { transactionId: original.transactionId },
    select: { id: true, amount: true, paymentId: true }
  });
  console.log('PAYMENT_ALLOCATION_STATUS', paymentAllocations.length === 0 ? 'NO ALLOCATION' : JSON.stringify(paymentAllocations, null, 2));

  const ledgerBefore = await prisma.ledgerEntry.findMany({
    where: { transactionId: original.transactionId },
    orderBy: { id: 'asc' },
    select: { id: true, entryType: true, amount: true, runningBalance: true, description: true }
  });
  console.log('LEDGER_BEFORE', JSON.stringify(ledgerBefore, null, 2));

  const newUnitPrice = new Prisma.Decimal(original.unitPrice).plus('1');
  const newLineTotal = newUnitPrice.times(new Prisma.Decimal(original.totalKg));
  const transactionSubtotalDelta = newLineTotal.minus(new Prisma.Decimal(original.lineTotal));
  const nextSubtotal = new Prisma.Decimal(original.subtotal).plus(transactionSubtotalDelta);
  const nextTotal = nextSubtotal.minus(new Prisma.Decimal(original.discount));

  console.log('EXPECTED_RECALC', JSON.stringify({
    newUnitPrice: newUnitPrice.toString(),
    newLineTotal: newLineTotal.toString(),
    subtotalDelta: transactionSubtotalDelta.toString(),
    nextSubtotal: nextSubtotal.toString(),
    nextTotal: nextTotal.toString(),
  }, null, 2));

  const partyId = original.partyId ?? null;
  const companyId = original.companyId ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.transactionItem.update({
      where: { id: original.itemId },
      data: {
        unitPrice: newUnitPrice,
        lineTotal: newLineTotal,
        chickenQuantity: new Prisma.Decimal(original.totalKg)
      }
    });

    await tx.transaction.update({
      where: { id: original.transactionId },
      data: {
        subtotal: nextSubtotal,
        totalAmount: nextTotal,
        dueAmount: nextTotal.minus(new Prisma.Decimal(original.paidAmount)),
        status: nextTotal.minus(new Prisma.Decimal(original.paidAmount)).gt(0) ? 'PENDING' : 'COMPLETED',
        updatedAt: new Date()
      }
    });

    const existingPurchaseLedger = await tx.ledgerEntry.findFirst({
      where: { transactionId: original.transactionId, entryType: 'PURCHASE' },
      orderBy: { id: 'asc' }
    });

    if (existingPurchaseLedger) {
      await tx.ledgerEntry.create({
        data: {
          partyId: existingPurchaseLedger.partyId,
          companyId: existingPurchaseLedger.companyId,
          transactionId: existingPurchaseLedger.transactionId,
          paymentId: null,
          entryDate: new Date(),
          entryType: 'PURCHASE_REVERSAL',
          amount: new Prisma.Decimal(existingPurchaseLedger.amount.toString()).negated(),
          runningBalance: new Prisma.Decimal(0),
          description: `Reversal of purchase item edit ${original.transactionId}`,
          referenceNumber: existingPurchaseLedger.referenceNumber
        }
      });
      await tx.ledgerEntry.create({
        data: {
          partyId: existingPurchaseLedger.partyId,
          companyId: existingPurchaseLedger.companyId,
          transactionId: existingPurchaseLedger.transactionId,
          paymentId: null,
          entryDate: new Date(),
          entryType: 'PURCHASE',
          amount: nextTotal,
          runningBalance: new Prisma.Decimal(0),
          description: `Purchase recalculation after item edit ${original.transactionId}`,
          referenceNumber: existingPurchaseLedger.referenceNumber
        }
      });
    }

    const accountFilter = partyId && companyId
      ? Prisma.sql`("partyId" = ${partyId} OR "companyId" = ${companyId})`
      : partyId
        ? Prisma.sql`"partyId" = ${partyId}`
        : Prisma.sql`"companyId" = ${companyId!}`;

    await tx.$executeRaw(Prisma.sql`
      WITH recalculated AS (
        SELECT "id", SUM("amount") OVER (ORDER BY "entryDate" ASC, "id" ASC) AS "runningBalance"
        FROM "LedgerEntry"
        WHERE ${accountFilter}
      )
      UPDATE "LedgerEntry" AS target
      SET "runningBalance" = recalculated."runningBalance"
      FROM recalculated
      WHERE target."id" = recalculated."id"
        AND target."runningBalance" IS DISTINCT FROM recalculated."runningBalance"
    `);
  });

  const itemAfter = await prisma.transactionItem.findUnique({
    where: { id: original.itemId },
    select: { unitPrice: true, lineTotal: true, chickenQuantity: true }
  });

  const transactionAfter = await prisma.transaction.findUnique({
    where: { id: original.transactionId },
    select: { subtotal: true, discount: true, totalAmount: true, dueAmount: true, paidAmount: true, status: true }
  });

  const ledgerAfter = await prisma.ledgerEntry.findMany({
    where: { transactionId: original.transactionId },
    orderBy: { id: 'asc' },
    select: { id: true, entryType: true, amount: true, runningBalance: true }
  });

  console.log('AFTER', JSON.stringify({
    item: itemAfter ? { unitPrice: itemAfter.unitPrice.toString(), lineTotal: itemAfter.lineTotal.toString(), chickenQuantity: itemAfter.chickenQuantity?.toString() ?? null } : null,
    transaction: transactionAfter ? { subtotal: transactionAfter.subtotal.toString(), discount: transactionAfter.discount.toString(), totalAmount: transactionAfter.totalAmount.toString(), dueAmount: transactionAfter.dueAmount.toString(), paidAmount: transactionAfter.paidAmount.toString(), status: transactionAfter.status } : null,
    ledger: ledgerAfter,
  }, null, 2));

  const partySummary = original.partyId ? await getPartyFinancialSummary(original.partyId) : null;
  console.log('PARTY_SUMMARY_AFTER', JSON.stringify(partySummary, null, 2));

  await prisma.$transaction(async (tx) => {
    await tx.transactionItem.update({
      where: { id: original.itemId },
      data: {
        unitPrice: new Prisma.Decimal(original.unitPrice),
        lineTotal: new Prisma.Decimal(original.lineTotal),
        chickenQuantity: new Prisma.Decimal(original.totalKg)
      }
    });
    await tx.transaction.update({
      where: { id: original.transactionId },
      data: {
        subtotal: new Prisma.Decimal(original.subtotal),
        discount: new Prisma.Decimal(original.discount),
        totalAmount: new Prisma.Decimal(original.total),
        dueAmount: new Prisma.Decimal(original.dueAmount),
        paidAmount: new Prisma.Decimal(original.paidAmount),
        status: original.dueAmount === '0' ? 'COMPLETED' : 'PENDING',
        updatedAt: new Date()
      }
    });
  });

  const final = await prisma.transactionItem.findUnique({
    where: { id: original.itemId },
    select: { unitPrice: true, lineTotal: true, chickenQuantity: true }
  });
  const finalTransaction = await prisma.transaction.findUnique({
    where: { id: original.transactionId },
    select: { subtotal: true, discount: true, totalAmount: true, dueAmount: true, status: true }
  });
  console.log('RESTORED', JSON.stringify({
    item: final ? { unitPrice: final.unitPrice.toString(), lineTotal: final.lineTotal.toString(), chickenQuantity: final.chickenQuantity?.toString() ?? null } : null,
    transaction: finalTransaction ? { subtotal: finalTransaction.subtotal.toString(), discount: finalTransaction.discount.toString(), totalAmount: finalTransaction.totalAmount.toString(), dueAmount: finalTransaction.dueAmount.toString(), status: finalTransaction.status } : null
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
