import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { AppShell } from '@/components/layout/app-shell';
import { auth } from '@/server/auth';
import { getBranding } from '@/lib/branding';

const inter = Inter({ subsets: ['latin'] });

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  let branding = null as Awaited<ReturnType<typeof getBranding>>;
  try {
    branding = await getBranding();
  } catch {
    // Ignore branding fetch errors.
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {branding?.favicon && <link rel="icon" href={branding.favicon} />}
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider session={session}>
            <AppShell branding={branding}>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
