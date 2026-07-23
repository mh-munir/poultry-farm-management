"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { UserNav } from '@/components/auth/user-nav';
import { ToastContainer } from '@/components/toast-container';

export default function LayoutShell({ children, theme }: { children: React.ReactNode; theme?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '';
  const hideShell = pathname.startsWith('/auth') || pathname === '/unauthorized';
  const getTitle = (p: string) => {
    const parts = p.split('/').filter(Boolean);
    if (!parts.length) return 'Home';
    return parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const pageTitle = getTitle(pathname);

  if (hideShell) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ToastContainer />
        {children}
      </div>
    );
  }

  return (
    <div className="flex">
      <ToastContainer />
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-h-screen md:ml-64">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 shadow-sm backdrop-blur-lg">
          <div className="mx-auto flex max-w-screen-3xl px-4 md:px-8 py-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 rounded-lg hover:bg-muted/60 transition-colors" onClick={() => setOpen(!open)} aria-label="Toggle menu">
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
              <Link href="/" className="text-lg font-semibold tracking-wide text-foreground">
                PoultryFarm
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <UserNav />
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
