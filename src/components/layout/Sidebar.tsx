"use client";

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Home, Users, Factory, BarChart2, Settings, LogOut, Package2, Wallet } from 'lucide-react';

export function Sidebar({ open, onClose, branding }: { open?: boolean; onClose?: () => void; branding: any }) {
  const pathname = usePathname() || '';
  const linkClass = (path: string) =>
    pathname === path
      ? 'flex items-center gap-3 rounded-lg px-3 py-2.5 transition bg-cyan-50 text-cyan-700 font-medium ring-1 ring-cyan-200'
      : 'flex items-center gap-3 rounded-lg px-3 py-2.5 transition text-slate-700 hover:bg-slate-100 hover:text-slate-900';
  const logoUrl = branding?.logo ?? null;
  const brandingName = branding?.name ?? null;

  return (
    <aside className={`w-64 border-r border-slate-200 bg-white min-h-screen px-4 py-6 fixed md:fixed z-40 top-0 left-0 h-full max-h-screen overflow-y-auto transform transition-transform shadow-2xl shadow-slate-200/40 duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-5 ring-1 ring-slate-200/70 shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-full bg-cyan-500/10 ring-1 ring-cyan-200 flex items-center justify-center text-xl font-bold text-cyan-700 overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              'P'
            )}
          </div>
          <div className="text-center">
            <div className="text-base font-medium text-slate-700">{brandingName}</div>
          </div>
        </div>
      </div>

      <nav className="space-y-1">
        <div className="px-3 pt-2 pb-1">
          <div className="text-sidebar-group">Main</div>
        </div>
        <ul className="space-y-1">
          <li>
            <Link href="/dashboard" onClick={() => onClose?.()} className={linkClass('/dashboard')}>
              <Home size={16} className="text-cyan-500" />
              <span className="text-sidebar-menu">Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/parties" onClick={() => onClose?.()} className={linkClass('/dashboard/parties')}>
              <Users size={16} className="text-cyan-500" />
              <span className="text-sidebar-menu">Parties</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/companies" onClick={() => onClose?.()} className={linkClass('/dashboard/companies')}>
              <Factory size={16} className="text-cyan-500" />
              <span className="text-sidebar-menu">Company's Stock</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/stock/reports" onClick={() => onClose?.()} className={linkClass('/dashboard/stock/reports')}>
              <Package2 size={16} className="text-cyan-500" />
              <span className="text-sidebar-menu">Stock Reports</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/expenses" onClick={() => onClose?.()} className={linkClass('/dashboard/expenses')}>
              <Wallet size={16} className="text-cyan-500" />
              <span className="text-sidebar-menu">Expenses</span>
            </Link>
          </li>
        </ul>

      <div className="pt-4">
        <div className="px-3 pt-2 pb-1">
          <div className="text-sidebar-group">Settings</div>
        </div>
        <ul className="space-y-1">
          <li>
            <Link href="/dashboard/reports" onClick={() => onClose?.()} className={linkClass('/dashboard/reports')}>
              <BarChart2 size={16} className="text-cyan-500" />
              <span className="text-sidebar-menu">Reports</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/settings" onClick={() => onClose?.()} className={linkClass('/dashboard/settings')}>
              <Settings size={16} className="text-cyan-500" />
              <span className="text-sidebar-menu">Settings</span>
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <button
          type="button"
          onClick={() => {
            onClose?.();
            signOut({ callbackUrl: '/auth/sign-in' });
          }}
          className={linkClass('/') + ' w-full cursor-pointer'}
        >
          <LogOut size={16} className="text-cyan-500" />
          <span className="text-sidebar-menu">Logout</span>
        </button>
      </div>
    </nav>
  </aside>
  );
}

export default Sidebar;
