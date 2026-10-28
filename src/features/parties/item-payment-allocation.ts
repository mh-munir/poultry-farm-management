import { Prisma } from '@prisma/client';

type PaymentAllocationInput = {
  lineTotals: Array<number | string>;
  paidAmount: number | string;
  dueAmount: number | string;
};

function toCents(value: number | string) {
  return BigInt(new Prisma.Decimal(value).mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toFixed(0));
}

function distributeCents(total: bigint, weights: bigint[]) {
  if (weights.length === 0) return [];

  const normalizedWeights = weights.every((weight) => weight === 0n)
    ? weights.map(() => 1n)
    : weights;
  const weightTotal = normalizedWeights.reduce((sum, weight) => sum + weight, 0n);
  const shares = normalizedWeights.map((weight) => (total * weight) / weightTotal);
  const remainders = normalizedWeights.map((weight) => (total * weight) % weightTotal);
  const undistributed = Number(total - shares.reduce((sum, share) => sum + share, 0n));
  const remainderOrder = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((left, right) => left.remainder === right.remainder
      ? left.index - right.index
      : left.remainder > right.remainder ? -1 : 1);

  for (let index = 0; index < undistributed; index += 1) {
    shares[remainderOrder[index].index] += 1n;
  }

  return shares;
}

export function allocateTransactionPayment({
  lineTotals,
  paidAmount,
  dueAmount
}: PaymentAllocationInput) {
  const weights = lineTotals.map((lineTotal) => {
    const cents = toCents(lineTotal);
    return cents > 0n ? cents : 0n;
  });
  const paidShares = distributeCents(toCents(paidAmount), weights);
  const dueShares = distributeCents(toCents(dueAmount), weights);

  return lineTotals.map((_, index) => ({
    paid: Number(paidShares[index]) / 100,
    due: Number(dueShares[index]) / 100
  }));
}
