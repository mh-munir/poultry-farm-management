import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { AppShell } from '@/components/layout/app-shell';
import { auth } from '@/server/auth';
import { getSetting } from '@/lib/settings';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  let icons: Metadata['icons'] = undefined;
  try {
    const branding = await getSetting('branding');
    const favicon = branding?.favicon ?? null;
    if (favicon) {
      icons = { icon: favicon };
    }
  } catch {
    // Ignore branding fetch errors and use default favicon.
  }
  return {
    title: 'Poultry Farm Management System',
    description: 'Production-ready architecture for a poultry farm management platform',
    icons
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider session={session}>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
