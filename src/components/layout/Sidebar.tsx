"use client";

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Home, Users, BarChart2, Settings, Shield, User, LogOut, ChevronDown, Box } from 'lucide-react';

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname() || '';
  const linkClass = (path: string) =>
    pathname === path
      ? 'flex items-center gap-3 rounded-2xl px-3 py-3 transition bg-cyan-50 text-cyan-700 font-semibold ring-1 ring-cyan-200'
      : 'flex items-center gap-3 rounded-2xl px-3 py-3 transition text-slate-700 hover:bg-slate-100 hover:text-slate-900';
  const [stockOpen, setStockOpen] = useState(false);

  return (
    <aside className={`w-64 border-r border-slate-200 bg-white min-h-screen px-4 py-6 fixed md:fixed z-40 top-0 left-0 h-full max-h-screen overflow-y-auto transform transition-transform shadow-2xl shadow-slate-200/40 duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-5 ring-1 ring-slate-200/70 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-3xl bg-cyan-500/10 ring-1 ring-cyan-200 flex items-center justify-center text-xl font-bold text-cyan-700">P</div>
          <div>
            <div className="text-base font-semibold text-slate-900">PoultryHQ</div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Farm management</div>
          </div>
        </div>
      </div>

      <nav className="space-y-5 text-sm">
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 ring-1 ring-slate-200/70">
          <div className="px-3 pb-2 text-[11px] uppercase tracking-[0.32em] text-slate-500">Main</div>
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard" onClick={() => onClose?.()} className={linkClass('/dashboard')}>
                <Home size={16} className="text-cyan-500" />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/parties" onClick={() => onClose?.()} className={linkClass('/dashboard/parties')}>
                <Users size={16} className="text-cyan-500" />
                <span>Parties</span>
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setStockOpen((s) => !s)}
                className={`w-full flex items-center justify-between rounded-2xl px-3 py-3 text-slate-700 transition-all duration-300 hover:bg-slate-100 ${stockOpen ? 'bg-slate-100 shadow-sm shadow-slate-200/60' : ''}`}>
                <span className="flex items-center gap-3">
                  <Box size={16} className="text-cyan-500" />
                  <span>Stock</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${stockOpen ? 'rotate-180' : ''}`} />
              </button>
              <ul className={`mt-3 space-y-2 pl-7 overflow-hidden transition-all duration-300 ease-out ${stockOpen ? 'max-h-56 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                <li>
                  <Link href="/dashboard/stock/Medicine" onClick={() => onClose?.()} className={linkClass('/dashboard/stock/Medicine')}>
                    <span>Medicine</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/stock/feed" onClick={() => onClose?.()} className={linkClass('/dashboard/stock/feed')}>
                    <span>Feed</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/stock/reports" onClick={() => onClose?.()} className={linkClass('/dashboard/stock/reports')}>
                    <span>Stock Reports</span>
                  </Link>
                </li>
              </ul>
              <div className="mt-4 border-t border-slate-200 pt-3 pl-7">
                <Link href="/dashboard/costs" onClick={() => onClose?.()} className={linkClass('/dashboard/costs')}>
                  <span>Costs</span>
                </Link>
              </div>
            </li>
          </ul>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 ring-1 ring-slate-200/70">
          <div className="px-3 pb-2 text-[11px] uppercase tracking-[0.32em] text-slate-500">Settings</div>
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard/reports" onClick={() => onClose?.()} className={linkClass('/dashboard/reports')}>
                <BarChart2 size={16} className="text-cyan-500" />
                <span>Reports</span>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/settings" onClick={() => onClose?.()} className={linkClass('/dashboard/settings')}>
                <Settings size={16} className="text-cyan-500" />
                <span>Settings</span>
              </Link>
            </li>
            <li>
              <Link href="/admin" onClick={() => onClose?.()} className={linkClass('/admin')}>
                <Shield size={16} className="text-cyan-500" />
                <span>Admin</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 ring-1 ring-slate-200/70">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              signOut({ callbackUrl: '/auth/sign-in' });
            }}
            className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-3 text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut size={16} className="text-cyan-500" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
  </aside>
  );
}

export default Sidebar;
