import { requireRole } from '@/lib/auth'
import LogoSettingsClient from '@/components/dashboard/settings-pages/LogoSettingsClient'
import { getBranding } from '@/lib/branding'

export default async function LogoPage() {
  await requireRole(['ADMIN','MANAGER'])
  const branding = await getBranding()

  return (
    <main className="mx-auto min-h-[70vh] max-w-screen-3xl px-6 py-10">
      <LogoSettingsClient initialBranding={branding} />
    </main>
  )
}
