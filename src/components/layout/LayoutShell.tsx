"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronRight } from 'lucide-react';
import Sidebar from './Sidebar';
import { UserNav } from '@/components/auth/user-nav';
import { ToastContainer } from '@/components/toast-container';

const PAGE_TITLES: Record<string, string[]> = {
  '/dashboard': ['Dashboard'],
  '/dashboard/parties': ['Parties'],
  '/dashboard/parties/new': ['Parties', 'New'],
  '/dashboard/stock': ['Stock'],
  '/dashboard/stock/feed': ['Stock', 'Feed'],
  '/dashboard/stock/Medicine': ['Stock', 'Medicine'],
  '/dashboard/stock/reports': ['Stock', 'Reports'],
  '/dashboard/expenses': ['Expenses'],
  '/dashboard/sales': ['Sales'],
  '/dashboard/purchases': ['Purchases'],
  '/dashboard/products': ['Products'],
  '/dashboard/products/new': ['Products', 'New'],
  '/dashboard/product-categories': ['Product Categories'],
  '/dashboard/product-categories/new': ['Product Categories', 'New'],
  '/dashboard/settings': ['Settings'],
  '/dashboard/settings/logo': ['Settings', 'Logo'],
  '/dashboard/settings/users': ['Settings', 'Users'],
  '/dashboard/settings/company': ['Settings', 'Company'],
  '/dashboard/settings/invoice': ['Settings', 'Invoice'],
  '/dashboard/settings/backup': ['Settings', 'Backup'],
  '/dashboard/settings/restore': ['Settings', 'Restore'],
  '/dashboard/reports': ['Reports'],
  '/dashboard/reports/daily': ['Reports', 'Daily'],
  '/dashboard/reports/monthly': ['Reports', 'Monthly'],
  '/dashboard/reports/yearly': ['Reports', 'Yearly'],
  '/dashboard/reports/profit-loss': ['Reports', 'Profit Loss'],
  '/dashboard/reports/sales': ['Reports', 'Sales'],
  '/dashboard/reports/purchases': ['Reports', 'Purchases'],
  '/dashboard/reports/stock': ['Reports', 'Stock'],
  '/dashboard/reports/party-statement': ['Reports', 'Party Statement']
};

function getPageTitle(pathname: string): string[] {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return ['Home'];

  const cleanSegment = (segment: string) =>
    segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  if (parts[0] === 'dashboard' && parts[1] === 'parties' && parts[2] && parts[2] !== 'new' && parts[2] !== 'edit' && parts[2] !== 'print') {
    return ['Parties', 'Profile'];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'parties' && parts[2] === 'new') {
    return ['Parties', 'New'];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'parties' && parts[2] === 'edit') {
    return ['Parties', 'Edit'];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'parties' && parts[2] === 'print') {
    return ['Parties', 'Print'];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'sales' && parts[2]) {
    return ['Sales', 'Detail'];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'purchases' && parts[2]) {
    return ['Purchases', 'Detail'];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'products' && parts[2] === 'new') {
    return ['Products', 'New'];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'products' && parts[3] === 'edit') {
    return ['Products', 'Edit'];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'product-categories' && parts[2] === 'new') {
    return ['Product Categories', 'New'];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'product-categories' && parts[2]) {
    return ['Product Categories', 'Edit'];
  }

  if (parts.length === 1) {
    return [cleanSegment(parts[0])];
  }

  return [cleanSegment(parts[0]), cleanSegment(parts[1])];
}

export default function LayoutShell({ children, theme, branding }: { children: React.ReactNode; theme?: string; branding: any }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '';
  const hideShell = pathname.startsWith('/auth') || pathname === '/unauthorized';
  const breadcrumbs = getPageTitle(pathname);

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
      <Sidebar open={open} onClose={() => setOpen(false)} branding={branding} />

      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-h-screen md:ml-64">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 shadow-sm backdrop-blur-lg">
          <div className="mx-auto flex max-w-screen-3xl px-4 md:px-8 py-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 rounded-lg hover:bg-muted/60 transition-colors" onClick={() => setOpen(!open)} aria-label="Toggle menu">
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
              <nav className="flex items-center gap-2 text-sm">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <span key={index} className="flex items-center gap-2">
                      {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span
                        className={
                          isLast
                            ? 'font-semibold text-foreground'
                            : 'text-muted-foreground hover:text-foreground transition-colors'
                        }
                      >
                        {crumb}
                      </span>
                    </span>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <UserNav />
            </div>
          </div>
        </header>

        <main className="p-6 text-table-body">{children}</main>
      </div>
    </div>
  );
}
