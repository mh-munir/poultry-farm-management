import 'dotenv/config'
import { prisma } from '../src/server/db/index'

async function main() {
  const roles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER'] as const
  const counts = await Promise.all(
    roles.map(async (role) => ({ role, count: await prisma.user.count({ where: { role } }) }))
  )
  const adminExists = (await prisma.user.count({ where: { email: 'admin@poultryfarm.test' } })) > 0

  console.log('ROLE_COUNTS:')
  for (const role of roles) {
    const entry = counts.find((item) => item.role === role)
    console.log(`${role}: ${entry?.count ?? 0}`)
  }
  console.log('EXISTING_ADMIN_TEST_USER:')
  console.log(adminExists ? 'true' : 'false')
}

main()
  .catch((err) => {
    console.error('READ-ONLY DATABASE CHECK FAILED')
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
