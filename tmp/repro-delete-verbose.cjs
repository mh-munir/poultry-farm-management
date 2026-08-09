require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('begin');
    console.log('connecting');
    await prisma.$connect();
    console.log('connected');

    console.log('creating temp party');
    const party = await prisma.party.create({ data: { name: 'Temp Delete Party4', phone: '01111111113', partyType: 'BOTH', openingBalance: 0 } });
    console.log('created party', party.id);

    console.log('deleting party', party.id);
    const deletedParty = await prisma.party.delete({ where: { id: party.id } });
    console.log('deleted party success', deletedParty.id);

    console.log('creating temp company');
    const company = await prisma.company.create({ data: { name: `Temp Delete Company ${Date.now()}`, companyType: 'FEED', isActive: true, openingBalance: 0 } });
    console.log('created company', company.id);

    console.log('deleting company', company.id);
    const deletedCompany = await prisma.company.delete({ where: { id: company.id } });
    console.log('deleted company success', deletedCompany.id);

    console.log('disconnecting');
    await prisma.$disconnect();
    console.log('done');
  } catch (error) {
    console.error('ERROR', error);
    try { await prisma.$disconnect(); } catch (e) { console.error('disconnect error', e); }
    process.exit(1);
  }
})();
