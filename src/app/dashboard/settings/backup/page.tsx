import { requireRole } from '@/lib/auth'
import BackupSettingsClient from '@/components/dashboard/settings-pages/BackupSettingsClient'

export default async function BackupPage() {
  await requireRole(['ADMIN','MANAGER'])
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-6 py-10">
      <BackupSettingsClient />
    </main>
  )
}
