import { prisma } from '../src/server/db/index.ts'
console.log('PRISMA_TYPE', typeof prisma)
await prisma.$disconnect()
