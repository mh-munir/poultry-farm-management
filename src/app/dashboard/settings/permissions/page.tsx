import { requireRole } from '@/lib/auth'
import PermissionsSettingsClient from '@/components/dashboard/settings-pages/PermissionsSettingsClient'

export default async function PermissionsPage() {
  await requireRole(['ADMIN','MANAGER'])
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-6 py-10">
      <PermissionsSettingsClient />
    </main>
  )
}
