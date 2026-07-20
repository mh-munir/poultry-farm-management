import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const { hash } = bcrypt;
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'admin@poultryfarm.test' },
    update: {},
    create: {
      email: 'admin@poultryfarm.test',
      name: 'Admin User',
      role: 'ADMIN',
      password: await hash('changeme123', 10)
    }
  });

  const feedCategory = await prisma.productCategory.upsert({
    where: { name: 'Feed' },
    update: {},
    create: {
      name: 'Feed',
      slug: 'feed',
      description: 'Feed products for poultry',
      isActive: true
    }
  });

  const medicineCategory = await prisma.productCategory.upsert({
    where: { name: 'Medicine' },
    update: {},
    create: {
      name: 'Medicine',
      slug: 'medicine',
      description: 'Medicine and supplements',
      isActive: true
    }
  });

  const feed = await prisma.product.upsert({
    where: { code: 'FEED-001' },
    update: {},
    create: {
      code: 'FEED-001',
      name: 'Layer Feed',
      productType: 'FEED',
      unit: 'bag',
      categoryId: feedCategory.id,
      defaultPurchasePrice: 2500,
      defaultSellingPrice: 2800,
      createdById: user.id
    }
  });

  await prisma.stockBalance.upsert({
    where: { productId: feed.id },
    update: {},
    create: {
      productId: feed.id,
      quantityOnHand: 100,
      averageCost: 2500
    }
  });

  const medicine = await prisma.product.upsert({
    where: { code: 'MED-001' },
    update: {},
    create: {
      code: 'MED-001',
      name: 'Vitamin Supplement',
      productType: 'MEDICINE',
      unit: 'bottle',
      categoryId: medicineCategory.id,
      defaultPurchasePrice: 1800,
      defaultSellingPrice: 2200,
      createdById: user.id
    }
  });

  await prisma.stockBalance.upsert({
    where: { productId: medicine.id },
    update: {},
    create: {
      productId: medicine.id,
      quantityOnHand: 50,
      averageCost: 1800
    }
  });

  const customer = await prisma.party.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Sample Customer',
      phone: '0712345678',
      email: 'customer@poultryfarm.test',
      partyType: 'CUSTOMER',
      openingBalance: 0,
      createdById: user.id
    }
  });

  await prisma.party.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Sample Supplier',
      phone: '0723456789',
      email: 'supplier@poultryfarm.test',
      partyType: 'SUPPLIER',
      openingBalance: 0,
      createdById: user.id
    }
  });

  console.log('Seed data created for', { user: user.email, customer: customer.name, feedCategory: feedCategory.name, medicineCategory: medicineCategory.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
