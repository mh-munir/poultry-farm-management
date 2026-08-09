import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const safeParty = await prisma.party.findFirst({
    where: {
      smsNotifications: { none: {} },
      transaction: { none: {} },
      payment: { none: {} },
      ledgerEntry: { none: {} },
      dueAdjustment: { none: {} }
    },
    select: { id: true, name: true, partyType: true }
  });

  const safeCompany = await prisma.company.findFirst({
    where: {
      smsNotifications: { none: {} },
      transaction: { none: {} },
      payment: { none: {} },
      ledgerEntry: { none: {} },
      dueAdjustment: { none: {} }
    },
    select: { id: true, name: true, companyType: true }
  });

  const partyCount = await prisma.party.count();
  const companyCount = await prisma.company.count();

  console.log(JSON.stringify({ safeParty, safeCompany, partyCount, companyCount }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
