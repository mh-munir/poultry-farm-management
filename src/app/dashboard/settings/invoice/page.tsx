import { requireRole } from '@/lib/auth'
import InvoiceSettingsClient from '@/components/dashboard/settings-pages/InvoiceSettingsClient'

export default async function InvoicePage() {
  await requireRole(['ADMIN','MANAGER'])
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-6 py-10">
      <InvoiceSettingsClient />
    </main>
  )
}
