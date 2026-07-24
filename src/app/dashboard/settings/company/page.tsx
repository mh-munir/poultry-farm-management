import { requireRole } from '@/lib/auth'
import CompanySettingsClient from '@/components/dashboard/settings-pages/CompanySettingsClient'

export default async function CompanyPage() {
  await requireRole(['ADMIN','MANAGER'])

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-6 py-10">
      <CompanySettingsClient />
    </main>
  )
}
