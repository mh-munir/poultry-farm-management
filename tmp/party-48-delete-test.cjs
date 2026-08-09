require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const partyId = 48;
    console.log('party delete start', partyId);
    const result = await prisma.party.delete({ where: { id: partyId } });
    console.log('party delete result', result.id);
  } catch (error) {
    console.error('party delete error', error);
  } finally {
    await prisma.$disconnect();
  }
})();
