import 'dotenv/config'
import { prisma } from '../src/server/db/index'
import fs from 'fs'
import path from 'path'

async function main() {
  const roles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER'] as const
  const counts = await Promise.all(
    roles.map(async (role) => ({ role, count: await prisma.user.count({ where: { role } }) }))
  )
  const adminExists = (await prisma.user.count({ where: { email: 'admin@poultryfarm.test' } })) > 0
  const out = {
    ROLE_COUNTS: Object.fromEntries(counts.map((item) => [item.role, item.count])),
    EXISTING_ADMIN_TEST_USER: adminExists,
  }
  const outputPath = path.resolve('tmp', 'readonly-prisma-counts-result.json')
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8')
}

main()
  .catch((err) => {
    const outputPath = require('path').resolve('tmp', 'readonly-prisma-counts-result.json')
    require('fs').writeFileSync(outputPath, JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2), 'utf8')
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
