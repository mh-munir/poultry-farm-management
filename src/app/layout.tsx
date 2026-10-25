import { cookies } from 'next/headers';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { AppShell } from '@/components/layout/app-shell';
import { auth } from '@/server/auth';
import { getBranding } from '@/lib/branding';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const locale = getLocaleFromValue((await cookies()).get(LOCALE_COOKIE)?.value ?? undefined);
  let branding = null as Awaited<ReturnType<typeof getBranding>>;
  try {
    branding = await getBranding();
  } catch {
    // Ignore branding fetch errors.
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {branding?.favicon && <link rel="icon" href={branding.favicon} />}
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider session={session}>
            <AppShell branding={branding}>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
