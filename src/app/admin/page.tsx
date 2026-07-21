import { requireRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { updateAdminCredentials } from './actions';

export default async function AdminPage({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const session = await requireRole(['ADMIN']);
  const currentEmail = session.user.email ?? '';
  const params = await searchParams;
  const error = params?.error ?? '';
  const success = params?.success ?? '';

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Administrative workspace</h1>
        <p className="mt-3 text-muted-foreground">
          Only administrators can access this area. Use the form below to update the administrator email and password.
        </p>
      </div>

      {(error || success) && (
        <div className={`rounded-xl border px-4 py-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {error || success}
        </div>
      )}

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin credentials</p>
          <h2 className="mt-2 text-2xl font-semibold">Update administrator account</h2>
          <p className="mt-2 text-sm text-muted-foreground">Change the admin email or password securely. Password updates are optional.</p>
        </div>

        <form action={updateAdminCredentials} className="grid gap-6">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Admin email</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={currentEmail}
              required
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">New password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Leave blank to keep current password"
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repeat new password"
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-muted p-4 text-sm text-slate-600">
            <p className="font-medium">Security note</p>
            <p className="mt-2">Updating this form will change the current administrator account. If you only want to update the email address, leave both password fields blank.</p>
          </div>

          <Button type="submit">Save admin credentials</Button>
        </form>
      </div>
    </main>
  );
}
