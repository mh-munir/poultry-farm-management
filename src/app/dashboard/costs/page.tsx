import CostsManager from '@/components/dashboard/CostsManager'
import { requireRole } from '@/lib/auth'

export default async function CostsPage() {
  await requireRole(['ADMIN','MANAGER'])

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-6 py-10">
      <CostsManager />
    </main>
  )
}
