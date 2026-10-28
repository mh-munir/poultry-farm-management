import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/server/db';
import { CACHE_TAGS } from '@/lib/cache';
import { calculatePartyNetBalances } from './balance-calculation';

const ZERO = new Prisma.Decimal(0);
const VALID_TRANSACTION_STATUSES = ['PENDING', 'COMPLETED'];
const VALID_PAYMENT_STATUSES = ['COMPLETED', 'PARTIAL'];

type Obligation = {
  id: number;
  createdAt: Date;
  transactionDate: Date;
  transactionType: string;
  amount: Prisma.Decimal;
};

const decimal = (value: Prisma.Decimal | null | undefined) => new Prisma.Decimal(value?.toString() ?? '0');
const nonNegative = (value: Prisma.Decimal) => Prisma.Decimal.max(ZERO, value);

async function getPartyFinancialSummaryUncached(partyId: number) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { id: true, openingBalance: true, openingBalanceType: true, partyType: true }
  });

  if (!party) throw new Error('Party not found.');

  const [transactions, payments] = await Promise.all([
    prisma.transaction.findMany({
      where: { partyId, transactionType: { in: ['SALE', 'PURCHASE'] }, status: { in: VALID_TRANSACTION_STATUSES } },
      select: { id: true, createdAt: true, transactionDate: true, transactionType: true, totalAmount: true }
    }),
    prisma.payment.findMany({
      where: {
        partyId,
        status: { in: VALID_PAYMENT_STATUSES },
        OR: [
          { paymentDirection: { in: ['CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT'] } },
          { paymentDirection: null }
        ]
      },
      select: { amount: true, paymentDirection: true }
    })
  ]);

  const openingAmount = decimal(party.openingBalance).abs();
  const openingAdvance = party.openingBalanceType === 'CUSTOMER_ADVANCE' ? openingAmount : ZERO;
  const openingDue = party.openingBalanceType === 'CUSTOMER_DUE' ? openingAmount : ZERO;
  const obligations: Obligation[] = transactions.map((transaction) => ({
    id: transaction.id,
    createdAt: transaction.createdAt,
    transactionDate: transaction.transactionDate,
    transactionType: transaction.transactionType,
    amount: decimal(transaction.totalAmount)
  })).sort((left, right) =>
    left.transactionDate.getTime() - right.transactionDate.getTime()
    || left.createdAt.getTime() - right.createdAt.getTime()
    || left.id - right.id
  );

  let remainingOpeningAdvance = openingAdvance;
  let customerOpeningOffset = ZERO;
  let customerSales = ZERO;
  let supplierPurchases = ZERO;

  for (const obligation of obligations) {
    if (obligation.transactionType === 'SALE') {
      const offset = Prisma.Decimal.min(remainingOpeningAdvance, obligation.amount);
      remainingOpeningAdvance = remainingOpeningAdvance.minus(offset);
      customerSales = customerSales.plus(obligation.amount);
      customerOpeningOffset = customerOpeningOffset.plus(offset);
    } else {
      supplierPurchases = supplierPurchases.plus(obligation.amount);
    }
  }

  let customerPayments = ZERO;
  let supplierPayments = ZERO;
  for (const payment of payments) {
    if (payment.paymentDirection === 'CUSTOMER_PAYMENT' || (!payment.paymentDirection && party.partyType !== 'PARTY')) {
      customerPayments = customerPayments.plus(decimal(payment.amount));
    }
    if (payment.paymentDirection === 'SUPPLIER_PAYMENT' || (!payment.paymentDirection && party.partyType === 'PARTY')) {
      supplierPayments = supplierPayments.plus(decimal(payment.amount));
    }
  }

  const remainingOpeningDue = nonNegative(openingDue.minus(customerPayments));
  const supplierAdvance = nonNegative(supplierPayments.minus(supplierPurchases));
  const { customerDue, supplierPayable } = calculatePartyNetBalances({
    openingBalance: party.openingBalance,
    openingBalanceType: party.openingBalanceType,
    customerSales,
    customerPayments,
    supplierPurchases,
    supplierPayments
  });

  return {
    originalOpeningAmount: openingAmount.toString(),
    openingBalanceType: party.openingBalanceType ?? 'CUSTOMER_DUE',
    originalOpeningAdvance: openingAdvance.toString(),
    usedOpeningAdvance: openingAdvance.minus(remainingOpeningAdvance).toString(),
    remainingOpeningAdvance: remainingOpeningAdvance.toString(),
    remainingOpeningDue: remainingOpeningDue.toString(),
    customerSales: customerSales.toString(),
    customerPayments: customerPayments.toString(),
    customerOpeningOffset: customerOpeningOffset.toString(),
    customerDue: customerDue.toString(),
    supplierPurchases: supplierPurchases.toString(),
    supplierPayments: supplierPayments.toString(),
    supplierAdvance: supplierAdvance.toString(),
    supplierPayable: supplierPayable.toString()
  };
}

const getPartyFinancialSummaryCached = unstable_cache(
  async (partyId: number) => getPartyFinancialSummaryUncached(partyId),
  ['party-financial-summary'],
  { tags: [CACHE_TAGS.parties, CACHE_TAGS.transactions], revalidate: 60 }
);

export async function getPartyFinancialSummary(partyId: number) {
  return getPartyFinancialSummaryCached(partyId);
}
