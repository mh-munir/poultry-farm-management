import Link from 'next/link';
import { requireUser } from '@/lib/auth';

export default async function NedicinPage() {
  await requireUser();

  return (
    <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-8">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Nedicin</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page will manage Medicine items for stock (add, edit, list).</p>
        <div className="mt-4">
          <Link href="/dashboard/stock" className="text-sm text-primary">Back to Stock</Link>
        </div>
      </div>
    </main>
  );
}
