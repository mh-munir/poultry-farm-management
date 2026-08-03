
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.product.findMany({
    where: { isActive: true, productType: 'FEED' },
    select: {
      id: true,
      name: true,
      unit: true,
      productType: true,
      defaultPurchasePrice: true,
      defaultSellingPrice: true,
      stockBalance: { select: { quantityOnHand: true } },
      transactionItems: {
        select: {
          transaction: {
            select: {
              id: true,
              transactionDate: true,
              paidAmount: true,
              dueAmount: true,
              party: { select: { name: true } },
              company: { select: { name: true } }
            }
          }
        },
        where: {
          transaction: { transactionType: 'PURCHASE' }
        },
        orderBy: {
          transaction: { transactionDate: 'desc' }
        },
        take: 1
      }
    },
    orderBy: { name: 'asc' }
  });
  console.log(JSON.stringify(items, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
