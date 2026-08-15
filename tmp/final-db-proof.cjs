const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    const product127 = await prisma.product.findUnique({
      where: { id: 127 },
      select: {
        id: true,
        name: true,
        productType: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            companyType: true
          }
        }
      }
    });

    const company54 = await prisma.company.findUnique({
      where: { id: 54 },
      select: {
        id: true,
        name: true,
        companyType: true
      }
    });

    console.log('=== Product 127 ===');
    console.log(JSON.stringify(product127, null, 2));
    console.log('');
    console.log('=== Company 54 ===');
    console.log(JSON.stringify(company54, null, 2));
    console.log('');

    const relationshipStatus =
      product127 && company54 && product127.companyId === company54.id
        ? 'MATCHES'
        : 'MISMATCH';

    console.log('=== Relationship check ===');
    console.log(JSON.stringify({
      product127CompanyId: product127?.companyId ?? null,
      company54Id: company54?.id ?? null,
      relationshipStatus
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('DB_PROOF_ERROR');
  console.error(error);
  process.exit(1);
});
