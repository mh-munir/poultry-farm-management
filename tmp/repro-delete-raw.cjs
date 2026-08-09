require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Creating temp party');
    const party = await prisma.party.create({ data: { name: 'Temp Delete Party', phone: '00000000000', partyType: 'BOTH', openingBalance: 0 } });
    console.log('Created party', party.id);
    const deletedParty = await prisma.party.delete({ where: { id: party.id } });
    console.log('Deleted party', deletedParty.id);

    console.log('Creating temp company');
    const company = await prisma.company.create({ data: { name: `Temp Delete Company ${Date.now()}`, companyType: 'FEED', isActive: true, openingBalance: 0 } });
    console.log('Created company', company.id);
    const deletedCompany = await prisma.company.delete({ where: { id: company.id } });
    console.log('Deleted company', deletedCompany.id);
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    await prisma.$disconnect();
  }
})();