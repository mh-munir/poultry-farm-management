import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const smsPartyViaTransaction = await prisma.smsNotification.findFirst({
    where: { transaction: { partyId: { not: null } } },
    select: { id: true, transactionId: true, partyId: true }
  });
  console.log('smsPartyViaTransaction', smsPartyViaTransaction);

  const smsCompanyViaTransaction = await prisma.smsNotification.findFirst({
    where: { transaction: { companyId: { not: null } } },
    select: { id: true, transactionId: true, companyId: true }
  });
  console.log('smsCompanyViaTransaction', smsCompanyViaTransaction);

  const partyCount = await prisma.smsNotification.count({ where: { transaction: { partyId: { not: null } } } });
  const companyCount = await prisma.smsNotification.count({ where: { transaction: { companyId: { not: null } } } });
  console.log('partyCount', partyCount, 'companyCount', companyCount);
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
