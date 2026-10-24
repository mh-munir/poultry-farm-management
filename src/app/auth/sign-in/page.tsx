import { cookies } from 'next/headers';
import { SignInForm } from '@/components/auth/sign-in-form';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { getDictionary } from '@/i18n';

export default async function SignInPage({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const success = params?.success ?? '';
  const error = params?.error ?? '';
  const locale = getLocaleFromValue((await cookies()).get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-8">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-[0_25px_50px_-25px_rgba(15,23,42,0.25)] backdrop-blur-sm">
          <div className="mb-8 space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <Clock className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary/80">{dict.auth.welcomeBack}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{dict.auth.signInTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {dict.auth.signInDescription}
            </p>
          </div>

          {(success || error) && (
            <div className={`mb-6 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {error ? (
                <AlertCircle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>{error || success}</span>
            </div>
          )}

          <SignInForm />

        </div>
      </div>
    </main>
  );
}
