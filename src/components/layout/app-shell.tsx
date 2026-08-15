import { cookies } from 'next/headers';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { LocaleProvider } from '@/i18n/provider';
import LayoutShell from './LayoutShell';

export async function AppShell({ children, branding }: { children: React.ReactNode; branding: any }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value ?? 'system';
  const locale = getLocaleFromValue(cookieStore.get(LOCALE_COOKIE)?.value ?? undefined);

  return (
    <LocaleProvider initialLocale={locale}>
      <div className="min-h-screen bg-background text-foreground">
        <LayoutShell theme={theme} branding={branding}>{children}</LayoutShell>
      </div>
    </LocaleProvider>
  );
}
