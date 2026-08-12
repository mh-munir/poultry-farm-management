import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { sendPasswordResetOtp, resetPasswordWithOtp } from './actions';

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: Promise<{ email?: string; step?: string; error?: string; success?: string }> }) {
  const params = await searchParams;
  const email = params?.email ?? '';
  const step = params?.step ?? 'request';
  const error = params?.error ?? '';
  const success = params?.success ?? '';

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Password recovery</p>
          <h1 className="mt-2 text-3xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your email to receive a one-time verification code and choose a new password.</p>
        </div>

        {(error || success) && (
          <div className={`mb-4 rounded-xl border px-4 py-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
            {error || success}
          </div>
        )}

        {step === 'request' ? (
          <form action={sendPasswordResetOtp} className="grid gap-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">Email address</label>
              <input id="email" name="email" type="email" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="you@example.com" />
            </div>
            <Button type="submit">Send verification code</Button>
          </form>
        ) : (
          <form action={resetPasswordWithOtp} className="grid gap-4">
            <input type="hidden" name="email" value={email} />
            <div>
              <label htmlFor="otpCode" className="mb-2 block text-sm font-medium">Verification code</label>
              <input id="otpCode" name="otpCode" type="text" inputMode="numeric" maxLength={6} required className="w-full rounded-md border bg-background px-3 py-2" placeholder="Enter 6-digit code" />
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
        )}

        <div className="mt-6 text-sm text-muted-foreground">
          <Link href="/auth/sign-in" className="text-primary hover:underline">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
