import { requireRole } from '@/lib/auth'
import RestoreSettingsClient from '@/components/dashboard/settings-pages/RestoreSettingsClient'

export default async function RestorePage() {
  await requireRole(['ADMIN','MANAGER'])
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-6 py-10">
      <RestoreSettingsClient />
    </main>
  )
}
