import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { resetAdminPassword } from './actions';

export default async function ResetAdminPage({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const error = params?.error ?? '';
  const success = params?.success ?? '';

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin reset</p>
          <h1 className="mt-2 text-3xl font-semibold">Reset administrator password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter the shared reset token and a new password to recover admin access.</p>
        </div>

        {(error || success) && (
          <div className={`rounded-xl border px-4 py-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
            {error || success}
          </div>
        )}

        <form action={resetAdminPassword} className="mt-6 grid gap-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">Admin email</label>
            <input id="email" name="email" type="email" required className="w-full rounded-md border bg-background px-3 py-2" />
          </div>

          <div>
            <label htmlFor="resetToken" className="mb-2 block text-sm font-medium">Reset token</label>
            <input id="resetToken" name="resetToken" type="text" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="Enter your admin reset token" />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">New password</label>
            <input id="password" name="password" type="password" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="At least 8 characters" />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">Confirm password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="Repeat new password" />
          </div>

          <Button type="submit">Reset password</Button>
        </form>

        <div className="mt-6 text-sm text-muted-foreground">
          <p>Need the token? Set `ADMIN_RESET_TOKEN` in your environment and share it securely.</p>
          <Link href="/auth/sign-in" className="text-primary hover:underline">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
