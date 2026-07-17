import { cookies } from 'next/headers';
import Link from 'next/link';
import { UserNav } from '@/components/auth/user-nav';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get('theme')?.value ?? 'system';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            PoultryFarm
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="transition hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/dashboard/parties" className="transition hover:text-foreground">
              Parties
            </Link>
            <Link href="/dashboard/product-categories" className="transition hover:text-foreground">
              Categories
            </Link>
            <Link href="/dashboard/reports" className="transition hover:text-foreground">
              Reports
            </Link>
            <Link href="/dashboard/settings" className="transition hover:text-foreground">
              Settings
            </Link>
            <UserNav />
            <span className="text-xs uppercase tracking-[0.2em]">{theme}</span>
          </nav>
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
