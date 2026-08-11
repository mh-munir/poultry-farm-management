"use client";

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Home, Users, Factory, BarChart2, Settings, LogOut, Wallet } from 'lucide-react';

export function Sidebar({ open, onClose, branding }: { open?: boolean; onClose?: () => void; branding: any }) {
  const pathname = usePathname() || '';
  const logoUrl = branding?.logo ?? null;
  const brandingName = branding?.name ?? null;

  const linkClass = (path: string) => {
    const active = pathname === path;
    return [
      'group flex items-center gap-3 rounded-[12px] px-4 h-11 transition-colors duration-200 ease-in-out',
      active
        ? 'bg-primary/10 text-primary border-l-4 border-primary'
        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
    ].join(' ');
  };

  return (
    <aside className={`fixed inset-y-0 left-0 top-0 z-40 w-[260px] min-h-screen overflow-y-auto rounded-[16px] border border-border bg-card text-foreground shadow-sm transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="flex h-full flex-col justify-between px-4 py-6">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 pt-6">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xl font-semibold text-foreground">P</span>
              )}
            </div>
            <div className="text-center">
              {brandingName ? (
                <div className="text-base font-semibold leading-5 text-foreground whitespace-pre-wrap break-words">
                  {brandingName}
                </div>
              ) : null}
            </div>
          </div>

          <nav className="space-y-5">
            <div className="space-y-3">
              <div className="px-3 pt-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-primary">Main</div>
              <ul className="space-y-1">
                <li>
                  <Link href="/dashboard" onClick={() => onClose?.()} className={linkClass('/dashboard')}>
                    <Home size={20} className={pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm font-medium">Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/parties" onClick={() => onClose?.()} className={linkClass('/dashboard/parties')}>
                    <Users size={20} className={pathname === '/dashboard/parties' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm font-medium">Parties</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/companies" onClick={() => onClose?.()} className={linkClass('/dashboard/companies')}>
                    <Factory size={20} className={pathname === '/dashboard/companies' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm font-medium">Companies</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/stock/reports" onClick={() => onClose?.()} className={linkClass('/dashboard/stock/reports')}>
                    <BarChart2 size={20} className={pathname === '/dashboard/stock/reports' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm font-medium">Stock Reports</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/expenses" onClick={() => onClose?.()} className={linkClass('/dashboard/expenses')}>
                    <Wallet size={20} className={pathname === '/dashboard/expenses' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm font-medium">Expenses</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="px-3 pt-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-primary">Settings</div>
              <ul className="space-y-1">
                <li>
                  <Link href="/dashboard/reports" onClick={() => onClose?.()} className={linkClass('/dashboard/reports')}>
                    <BarChart2 size={20} className={pathname === '/dashboard/reports' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm font-medium">Reports</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/settings" onClick={() => onClose?.()} className={linkClass('/dashboard/settings')}>
                    <Settings size={20} className={pathname === '/dashboard/settings' ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-sm font-medium">Settings</span>
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-6 px-3 pb-5">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              signOut({ callbackUrl: '/auth/sign-in' });
            }}
            className="group flex w-full items-center gap-3 rounded-[12px] border border-border bg-background px-4 h-11 text-foreground transition-colors duration-200 ease-in-out hover:bg-muted/60"
          >
            <LogOut size={20} className="text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
