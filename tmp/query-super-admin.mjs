import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const roles = ['SUPER_ADMIN','ADMIN','MANAGER','USER']
    const counts = {}
    for (const r of roles) {
      try {
        counts[r] = await prisma.user.count({ where: { role: r } })
      } catch (e) {
        counts[r] = null
      }
    }

    // Safe select for SUPER_ADMIN users
    let superAdmins = []
    try {
      superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true, email: true, role: true } })
    } catch (e) {
      console.error('DB_QUERY_ERROR', (e && e.message) || e)
      process.exit(2)
    }

    console.log('ROLE_COUNTS:' + JSON.stringify(counts))
    if (!superAdmins || superAdmins.length === 0) {
      console.log('NO SUPER_ADMIN EXISTS')
    } else {
      console.log('SUPER_ADMINS:' + JSON.stringify(superAdmins))
    }
  } catch (err) {
    console.error('UNEXPECTED_ERROR', err && err.message ? err.message : err)
    process.exit(3)
  } finally {
    await prisma.$disconnect()
  }
}

main()
