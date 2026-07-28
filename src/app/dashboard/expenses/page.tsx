import ExpensesManager from '@/components/dashboard/ExpensesManager'
import { requireRole } from '@/lib/auth'

export default async function ExpensesPage() {
  await requireRole(['ADMIN','MANAGER'])

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <ExpensesManager />
    </main>
  )
}