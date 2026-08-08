const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT id, name, companyType
    FROM Company
    WHERE companyType = 'BOTH'
  `;
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
