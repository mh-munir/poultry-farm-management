import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const counts = await Promise.all([
    prisma.company.count(),
    prisma.party.count(),
    prisma.product.count(),
    prisma.productCategory.count(),
    prisma.transaction.count(),
    prisma.payment.count(),
    prisma.ledgerEntry.count(),
    prisma.stockBalance.count()
  ]);

  console.log(JSON.stringify({
    company: counts[0],
    party: counts[1],
    product: counts[2],
    category: counts[3],
    transaction: counts[4],
    payment: counts[5],
    ledgerEntry: counts[6],
    stockBalance: counts[7]
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
