"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronRight, Sun, Moon, Languages } from 'lucide-react';
import { useTheme } from 'next-themes';
import Sidebar from './Sidebar';
import { UserNav } from '@/components/auth/user-nav';
import { ToastContainer } from '@/components/toast-container';
import { useLocale } from '@/i18n/provider';

function getPageTitle(pathname: string, dict: any): string[] {
  const pageTitles: Record<string, string[]> = {
    '/dashboard': [dict.nav.dashboard],
    '/dashboard/parties': [dict.nav.parties],
    '/dashboard/parties/new': [dict.nav.parties, dict.common.new],
    '/dashboard/stock/reports': [dict.nav.stockReports],
    '/dashboard/expenses': [dict.nav.expenses],
    '/dashboard/sales': [dict.common.sales],
    '/dashboard/purchases': [dict.common.purchases],
    '/dashboard/products': [dict.common.products],
    '/dashboard/products/new': [dict.common.products, dict.common.new],
    '/dashboard/settings': [dict.nav.settings],
    '/dashboard/settings/logo': [dict.nav.settings, dict.settings.logo],
    '/dashboard/settings/users': [dict.nav.settings, dict.common.users ?? 'Users'],
    '/dashboard/settings/company': [dict.nav.settings, dict.common.companies],
    '/dashboard/settings/invoice': [dict.nav.settings, dict.settings.invoiceTitle],
    '/dashboard/settings/backup': [dict.nav.settings, dict.settings.backup],
    '/dashboard/settings/restore': [dict.nav.settings, dict.settings.restore],
    '/dashboard/reports': [dict.nav.reports],
    '/dashboard/reports/daily': [dict.nav.reports, dict.reports.daily],
    '/dashboard/reports/monthly': [dict.nav.reports, dict.reports.monthly],
    '/dashboard/reports/yearly': [dict.nav.reports, dict.reports.yearly],
    '/dashboard/reports/profit-loss': [dict.nav.reports, dict.reports.profitLoss],
    '/dashboard/reports/sales': [dict.nav.reports, dict.common.sales],
    '/dashboard/reports/purchases': [dict.nav.reports, dict.common.purchases],
    '/dashboard/reports/stock': [dict.nav.reports, dict.common.stock],
    '/dashboard/reports/party-statement': [dict.nav.reports, dict.reports.partyStatement]
  };

  const getSegmentLabel = (segment: string): string => {
    const normalized = segment.toLowerCase();
    const segmentMap: Record<string, string> = {
      home: dict.nav.dashboard ?? dict.common.dashboard ?? 'Dashboard',
      dashboard: dict.nav.dashboard ?? dict.common.dashboard ?? 'Dashboard',
      settings: dict.nav.settings ?? dict.common.settings ?? 'Settings',
      reports: dict.nav.reports ?? dict.common.reports ?? 'Reports',
      parties: dict.nav.parties ?? dict.common.parties ?? 'Parties',
      companies: dict.nav.companies ?? dict.common.companies ?? 'Companies',
      products: dict.common.products ?? 'Products',
      sales: dict.common.sales ?? 'Sales',
      purchases: dict.common.purchases ?? 'Purchases',
      expenses: dict.nav.expenses ?? dict.common.expenses ?? 'Expenses',
      stock: dict.common.stock ?? 'Stock',
      users: dict.common.users ?? 'Users',
      profile: dict.common.profile ?? 'Profile',
      categories: dict.common.categories ?? 'Categories',
      new: dict.common.new ?? 'New'
    };

    return segmentMap[normalized] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (pageTitles[pathname]) return pageTitles[pathname];

  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return [dict.nav.dashboard ?? dict.common.dashboard ?? 'Dashboard'];

  if (parts[0] === 'dashboard' && parts[1] === 'parties' && parts[2] && parts[2] !== 'new' && parts[2] !== 'edit' && parts[2] !== 'print') {
    return [dict.nav.parties, dict.common.profile];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'parties' && parts[2] === 'new') {
    return [dict.nav.parties, dict.common.new];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'parties' && parts[2] === 'edit') {
    return [dict.nav.parties, dict.common.edit];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'parties' && parts[2] === 'print') {
    return [dict.nav.parties, dict.common.print];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'sales' && parts[2]) {
    return [dict.common.sales, dict.common.detail];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'purchases' && parts[2]) {
    return [dict.common.purchases, dict.common.detail];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'products' && parts[2] === 'new') {
    return [dict.common.products, dict.common.new];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'companies' && parts[2] && parts[2] !== 'new') {
    return [dict.nav.companies, dict.common.profile];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'products' && parts[3] === 'edit') {
    return [dict.common.products, dict.common.edit];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'product-categories' && parts[2] === 'new') {
    return [dict.common.categories ?? 'Categories', dict.common.new];
  }
  if (parts[0] === 'dashboard' && parts[1] === 'product-categories' && parts[2]) {
    return [dict.common.categories ?? 'Categories', dict.common.edit];
  }

  if (parts.length === 1) {
    return [getSegmentLabel(parts[0])];
  }

  return [getSegmentLabel(parts[0]), getSegmentLabel(parts[1])];
}

export default function LayoutShell({ children, branding }: { children: React.ReactNode; branding: any }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '';
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { locale, setLocale, dict } = useLocale();

  const languageText = locale === 'en' ? dict.common.bangla : dict.common.english;
  const languageLabel = locale === 'en' ? dict.common.switchToBangla : dict.common.switchToEnglish;

  useEffect(() => {
    setMounted(true);
  }, []);
  const hideShell = useMemo(() => {
    if (!pathname) return false;
    return (
      pathname.startsWith('/auth') ||
      pathname === '/unauthorized' ||
      pathname.endsWith('/print') ||
      pathname.includes('/print/')
    );
  }, [pathname]);
  const breadcrumbs = useMemo(() => getPageTitle(pathname, dict), [pathname, dict]);

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

      <div className="min-w-0 flex-1 min-h-screen md:pl-[260px]">
        <header className="sticky top-0 z-40 border-b border-border bg-surface/95 shadow-sm backdrop-blur-lg">
          <div className="mx-auto flex max-w-screen-3xl gap-3 px-3 py-3 items-center justify-between md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button className="md:hidden p-2 rounded-lg hover:bg-muted/60 transition-colors" onClick={() => setOpen(!open)} aria-label={dict.common.toggleMenu}>
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
              <nav className="flex flex-1 items-center gap-2 text-sm overflow-x-auto whitespace-nowrap min-w-0">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <span key={index} className="flex items-center gap-2">
                      {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span
                        className={
                          isLast
                            ? 'font-semibold text-foreground truncate min-w-0'
                            : 'text-muted-foreground hover:text-foreground transition-colors truncate min-w-0'
                        }
                      >
                        {crumb}
                      </span>
                    </span>
                  );
                })}
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setLocale(locale === 'en' ? 'bn' : 'en')}
                aria-label={languageLabel}
                title={languageLabel}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-medium text-foreground transition hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <Languages className="h-4 w-4" />
                <span>{languageText}</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                aria-label={dict.common.themeToggle}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                {mounted ? (
                  resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
                ) : (
                  <span className="h-4 w-4" />
                )}
              </button>
              <UserNav />
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 text-table-body">{children}</main>
      </div>
    </div>
  );
}
