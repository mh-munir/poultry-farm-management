import { Prisma } from '@prisma/client';

type PartyBalanceInput = {
  openingBalance: Prisma.Decimal | number | string;
  openingBalanceType: string | null;
  customerSales: Prisma.Decimal | number | string;
  customerPayments: Prisma.Decimal | number | string;
  supplierPurchases: Prisma.Decimal | number | string;
  supplierPayments: Prisma.Decimal | number | string;
};

const decimal = (value: Prisma.Decimal | number | string) => new Prisma.Decimal(value);
const ZERO = new Prisma.Decimal(0);

export function calculatePartyNetBalances({
  openingBalance,
  openingBalanceType,
  customerSales,
  customerPayments,
  supplierPurchases,
  supplierPayments
}: PartyBalanceInput) {
  const openingAmount = decimal(openingBalance).abs();
  const signedOpeningBalance = openingBalanceType === 'CUSTOMER_ADVANCE'
    ? openingAmount.negated()
    : openingAmount;
  const netBalance = signedOpeningBalance
    .plus(decimal(customerSales))
    .minus(decimal(customerPayments))
    .minus(decimal(supplierPurchases))
    .plus(decimal(supplierPayments));

  return {
    customerDue: Prisma.Decimal.max(ZERO, netBalance),
    supplierPayable: Prisma.Decimal.max(ZERO, netBalance.negated())
  };
}
