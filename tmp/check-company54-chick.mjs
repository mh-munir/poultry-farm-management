import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const company = await prisma.company.findUnique({
  where: { id: 54 },
  select: {
    id: true,
    name: true,
    companyType: true,
    isActive: true,
    createdAt: true,
    updatedAt: true
  }
});

const products = await prisma.product.findMany({
  where: { companyId: 54 },
  select: {
    id: true,
    name: true,
    productType: true,
    companyId: true,
    createdAt: true,
    updatedAt: true,
    company: { select: { id: true, name: true } }
  }
});

const chickRecords = await prisma.product.findMany({
  where: { companyId: 54, productType: 'CHICK' },
  select: {
    id: true,
    name: true,
    productType: true,
    companyId: true,
    createdAt: true,
    updatedAt: true,
    company: { select: { id: true, name: true } }
  }
});

const result = { company, products, chickRecords };
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
