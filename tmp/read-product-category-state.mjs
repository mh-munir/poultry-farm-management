import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env' });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } }
});

try {
  const [categories, products, categoryCount, groupedProducts, nullCategoryProducts] = await Promise.all([
    prisma.productCategory.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, slug: true, description: true, isActive: true }
    }),
    prisma.product.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        productType: true,
        categoryId: true,
        category: { select: { id: true, name: true, slug: true } }
      }
    }),
    prisma.productCategory.count(),
    prisma.product.groupBy({
      by: ['categoryId', 'productType'],
      _count: { _all: true },
      orderBy: [{ categoryId: 'asc' }, { productType: 'asc' }]
    }),
    prisma.product.findMany({
      where: { categoryId: null },
      orderBy: { id: 'asc' },
      select: { id: true, code: true, name: true, productType: true }
    })
  ]);

  console.log(JSON.stringify({ categories, categoryCount, products, groupedProducts, nullCategoryProducts }, null, 2));
} finally {
  await prisma.$disconnect();
}
