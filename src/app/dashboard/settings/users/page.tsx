import { requireRole } from '@/lib/auth'
import { prisma } from '@/server/db'
import UsersSettingsClient from '@/components/dashboard/settings-pages/UsersSettingsClient'

export default async function UsersPage() {
  const session = await requireRole(['ADMIN', 'MANAGER', 'SUPER_ADMIN'])

  let users: Array<{ id: string; name: string | null; email: string | null; role: string }> = []
  try {
    users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { createdAt: 'desc' }
    })
  } catch {
    // Ignore DB errors for user listing
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, role: true }
  })

  return (
    <main className="mx-auto min-h-[70vh] max-w-screen-3xl px-6 py-10">
      <UsersSettingsClient
        initialName={adminUser?.name ?? ''}
        initialEmail={adminUser?.email ?? ''}
        initialImage={adminUser?.image ?? ''}
        users={users}
        isSuperAdmin={adminUser?.role === 'SUPER_ADMIN'}
      />
    </main>
  )
}
