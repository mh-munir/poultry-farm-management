import { requireRole } from '@/lib/auth';
import AdminCredentialsForm from './admin-credentials-form';
import AdminToastRedirect from './admin-toast-redirect';

export default async function AdminPage({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const session = await requireRole(['ADMIN']);
  const currentEmail = session.user.email ?? '';
  const currentName = session.user.name ?? '';
  const currentImage = session.user.image ?? '';
  const sp = await searchParams;
  const success = sp?.success ?? '';
  const error = sp?.error ?? '';

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl flex-col gap-6 px-6 py-10">
      <AdminToastRedirect initialSuccess={success ?? undefined} initialError={error ?? undefined} />

      <div className="rounded-xl border bg-card p-8 shadow-sm flex items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
          {currentImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentImage} alt={currentName || 'Admin avatar'} className="h-full w-full object-cover" />
          ) : (
            <div className="text-2xl font-semibold text-muted-foreground">{(currentName || 'A').charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">{currentName || 'Administrator'}</h1>
          {currentEmail ? <p className="mt-1 text-sm text-muted-foreground">{currentEmail}</p> : null}
          <p className="mt-3 text-muted-foreground">Only administrators can access this area. Update admin name, image, email or password below.</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin credentials</p>
          <h2 className="mt-2 text-2xl font-semibold">Update administrator account</h2>
          <p className="mt-2 text-sm text-muted-foreground">Change the admin name, image, email or password securely. Password updates are optional.</p>
        </div>

        <AdminCredentialsForm currentName={currentName} currentEmail={currentEmail} currentImage={currentImage} />
      </div>
    </main>
  );
}
