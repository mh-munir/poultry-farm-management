import { requireRole } from '@/lib/auth'
import LogoSettingsClient from '@/components/dashboard/settings-pages/LogoSettingsClient'

export default async function LogoPage() {
  await requireRole(['ADMIN','MANAGER'])
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-6 py-10">
      <LogoSettingsClient />
    </main>
  )
}
