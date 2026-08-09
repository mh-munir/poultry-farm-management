require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const party = await prisma.party.findFirst({
    where: { transaction: { some: {} } },
    select: { id: true, name: true }
  });
  console.log('dependent party', party);
  if (party) {
    try {
      await prisma.party.delete({ where: { id: party.id } });
      console.log('party delete succeeded unexpectedly');
    } catch (error) {
      console.error('party delete error', error);
    }
  }

  const company = await prisma.company.findFirst({
    where: { transaction: { some: {} } },
    select: { id: true, name: true }
  });
  console.log('dependent company', company);
  if (company) {
    try {
      await prisma.company.delete({ where: { id: company.id } });
      console.log('company delete succeeded unexpectedly');
    } catch (error) {
      console.error('company delete error', error);
    }
  }
}

main()
  .catch((error) => {
    console.error('fatal error', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
