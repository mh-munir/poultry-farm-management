import { requireRole } from '@/lib/auth'
import UsersSettingsClient from '@/components/dashboard/settings-pages/UsersSettingsClient'

export default async function UsersPage() {
  await requireRole(['ADMIN','MANAGER'])
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-6 py-10">
      <UsersSettingsClient />
    </main>
  )
}
