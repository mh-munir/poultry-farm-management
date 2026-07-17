import { requireRole } from '@/lib/auth';

export default async function AdminPage() {
  await requireRole(['ADMIN']);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Administrative workspace</h1>
        <p className="mt-3 text-muted-foreground">
          Only administrators can access this area.
        </p>
      </div>
    </main>
  );
}
