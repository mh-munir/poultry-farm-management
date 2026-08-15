import Link from 'next/link';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import { sendPasswordResetOtp, resetPasswordWithOtp } from './actions';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { getDictionary } from '@/i18n';

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: Promise<{ email?: string; step?: string; error?: string; success?: string }> }) {
  const params = await searchParams;
  const email = params?.email ?? '';
  const step = params?.step ?? 'request';
  const error = params?.error ?? '';
  const success = params?.success ?? '';
  const locale = getLocaleFromValue((await cookies()).get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.auth.passwordRecovery}</p>
          <h1 className="mt-2 text-3xl font-semibold">{dict.auth.resetYourPassword}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{dict.auth.resetYourPasswordDescription}</p>
        </div>

        {(error || success) && (
          <div className={`mb-4 rounded-xl border px-4 py-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
            {error || success}
          </div>
        )}

        {step === 'request' ? (
          <form action={sendPasswordResetOtp} className="grid gap-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">{dict.auth.emailAddress}</label>
              <input id="email" name="email" type="email" required className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.auth.youExample} />
            </div>
            <Button type="submit">{dict.auth.sendVerificationCode}</Button>
          </form>
        ) : (
          <form action={resetPasswordWithOtp} className="grid gap-4">
            <input type="hidden" name="email" value={email} />
            <div>
              <label htmlFor="otpCode" className="mb-2 block text-sm font-medium">{dict.auth.verificationCode}</label>
              <input id="otpCode" name="otpCode" type="text" inputMode="numeric" maxLength={6} required className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.auth.enterSixDigitCode} />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">{dict.common.newPassword}</label>
              <input id="password" name="password" type="password" required className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.auth.atLeastEight} />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">{dict.common.confirmPassword}</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.auth.repeatNewPassword} />
            </div>
            <Button type="submit">{dict.common.resetPassword}</Button>
          </form>
        )}

        <div className="mt-6 text-sm text-muted-foreground">
          <Link href="/auth/sign-in" className="text-primary hover:underline">{dict.common.backToSignIn}</Link>
        </div>
      </div>
    </main>
  );
}
