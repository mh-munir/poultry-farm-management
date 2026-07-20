"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { UserNav } from '@/components/auth/user-nav';

export default function LayoutShell({ children, theme }: { children: React.ReactNode; theme?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '';
  const hideShell = pathname.startsWith('/auth') || pathname === '/unauthorized';
  const linkClass = (path: string) => (pathname === path ? 'text-foreground font-medium' : 'text-muted-foreground');
  const getTitle = (p: string) => {
    const map: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/dashboard/parties': 'Parties',
      '/dashboard/product-categories': 'Categories',
      '/dashboard/reports': 'Reports',
      '/dashboard/settings': 'Settings',
      '/admin': 'Admin',
      '/staff': 'Staff',
    };
    if (map[p]) return map[p];
    // fallback: take last segment
    const parts = p.split('/').filter(Boolean);
    if (!parts.length) return 'Home';
    return parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const pageTitle = getTitle(pathname);

  if (hideShell) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="flex">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-h-screen">
        <header className="border-b">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 rounded-md hover:bg-muted/50" onClick={() => setOpen(!open)} aria-label="Toggle menu">
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
              <Link href="/" className="text-lg font-semibold">
                PoultryFarm
              </Link>
            </div>

            <div className="flex-1 px-4">
              <div className="text-sm text-muted-foreground/70">{pageTitle}</div>
            </div>

            <div className="hidden md:flex items-center gap-4 text-sm">
              {/* Primary navigation moved to sidebar on desktop and mobile */}
              <span className="text-sm text-muted-foreground/70">Primary navigation is in the sidebar</span>
            </div>

            <div className="flex items-center gap-4">
              <UserNav />
              <span className="text-xs uppercase tracking-[0.2em]">{theme}</span>
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
