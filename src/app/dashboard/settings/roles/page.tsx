import { requireRole } from '@/lib/auth'
import RolesSettingsClient from '@/components/dashboard/settings-pages/RolesSettingsClient'

export default async function RolesPage() {
  await requireRole(['ADMIN','MANAGER'])
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-6 py-10">
      <RolesSettingsClient />
    </main>
  )
}
