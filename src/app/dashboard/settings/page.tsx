import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import SettingsManager from '@/components/dashboard/SettingsManager';
import { env, getSmsProviderStatusMessage, isSmsProviderConfigured } from '@/lib/env';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { getDictionary } from '@/i18n';

export default async function SettingsPage() {
  const session = await requireUser();
  const cookieStore = await cookies();
  const locale = getLocaleFromValue(cookieStore.get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);
  const userName = session.user.name ?? session.user.email ?? 'there';
  const smsConfigured = isSmsProviderConfigured();
  const smsStatusMessage = getSmsProviderStatusMessage();

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.nav.settings}</p>
        <h1 className="mt-2 text-3xl font-semibold">{dict.settings.systemSettings}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{dict.common.welcomeBackUser.replace('{{name}}', userName)}</p>
      </div>

      {(!smsConfigured || env.SMS_PROVIDER?.trim().toLowerCase() === 'mock') && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-sm">
          <p className="font-semibold">{dict.settings.smsWarningTitle}</p>
          <p className="mt-1 text-sm">{smsStatusMessage}</p>
          <p className="mt-2 text-sm text-rose-700">{dict.settings.smsWarningDescription}</p>
        </div>
      )}

      <div className="mt-6">
        <SettingsManager />
      </div>
    </main>
  );
}
