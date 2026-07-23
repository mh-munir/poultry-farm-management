import { requireRole } from '@/lib/auth';
import { prisma } from '@/server/db';
import AdminCredentialsForm from './admin-credentials-form';
import AdminToastRedirect from './admin-toast-redirect';

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value);
}

export default async function AdminPage({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const session = await requireRole(['ADMIN']);
  const currentEmail = session.user.email ?? '';
  const currentName = session.user.name ?? '';
  const currentImage = session.user.image ?? '';
  const sp = await searchParams;
  const success = sp?.success ?? '';
  const error = sp?.error ?? '';
  const smsNotifications = await prisma.smsNotification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: {
      id: true,
      phoneNumber: true,
      saleType: true,
      message: true,
      status: true,
      provider: true,
      errorMessage: true,
      createdAt: true,
      party: { select: { name: true } }
    }
  });

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl flex-col gap-6 px-6 py-10">
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

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">SMS notifications</p>
          <h2 className="mt-2 text-2xl font-semibold">Recent SMS logs</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-3 font-medium">Party</th>
                <th className="px-3 py-3 font-medium">Phone</th>
                <th className="px-3 py-3 font-medium">Sale type</th>
                <th className="px-3 py-3 font-medium">Message preview</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Provider</th>
                <th className="px-3 py-3 font-medium">Created</th>
                <th className="px-3 py-3 font-medium">Error reason</th>
              </tr>
            </thead>
            <tbody>
              {smsNotifications.length > 0 ? (
                smsNotifications.map((notification) => (
                  <tr key={notification.id} className="border-t align-top">
                    <td className="px-3 py-3">{notification.party.name}</td>
                    <td className="px-3 py-3">{notification.phoneNumber ?? '-'}</td>
                    <td className="px-3 py-3">{notification.saleType}</td>
                    <td className="max-w-xs whitespace-pre-line px-3 py-3">{notification.message.slice(0, 160)}</td>
                    <td className="px-3 py-3">{notification.status}</td>
                    <td className="px-3 py-3">{notification.provider}</td>
                    <td className="px-3 py-3">{formatDate(notification.createdAt)}</td>
                    <td className="px-3 py-3">{notification.errorMessage ?? '-'}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t">
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No SMS notifications have been logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
