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
      ? 'flex items-center gap-3 px-2 py-2 transition bg-muted/60 font-medium border-l-4 border-indigo-600'
      : 'flex items-center gap-3 px-2 py-2 transition hover:bg-muted/50';
  const [stockOpen, setStockOpen] = useState(false);

  return (
    <aside className={`w-64 border-r bg-surface min-h-screen px-4 py-6 fixed md:static z-40 top-0 left-0 h-full transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="h-9 w-9 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold">P</div>
        <div>
          <div className="text-lg font-semibold">Poultry</div>
        </div>
      </div>

      <nav className="text-sm text-muted-foreground">
        <ul className="space-y-1">
          <li>
            <Link href="/dashboard" onClick={() => onClose?.()} className={linkClass('/dashboard')}>
              <Home size={16} />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/parties" onClick={() => onClose?.()} className={linkClass('/dashboard/parties')}>
              <Users size={16} />
              <span>Parties</span>
            </Link>
          </li>
          {/* Stock parent with submenu */}
          <li>
            <button
              type="button"
              onClick={() => setStockOpen((s) => !s)}
              className={`w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted/50 transition ${stockOpen ? 'bg-muted/50' : ''}`}>
              <span className="flex items-center gap-3">
                <Box size={16} />
                <span>Stock</span>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${stockOpen ? 'rotate-180' : ''}`} />
            </button>
            {stockOpen && (
              <ul className="mt-2 space-y-1 pl-8">
                <li>
                  <Link href="/dashboard/stock" onClick={() => onClose?.()} className={linkClass('/dashboard/stock')}>
                    <span>Medicine</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/stock/feed" onClick={() => onClose?.()} className={linkClass('/dashboard/stock/feed')}>
                    <span>Feed</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          <li>
            <Link href="/dashboard/reports" onClick={() => onClose?.()} className={linkClass('/dashboard/reports')}>
              <BarChart2 size={16} />
              <span>Reports</span>
            </Link>
          </li>
          <li>
            <Link href="/dashboard/settings" onClick={() => onClose?.()} className={linkClass('/dashboard/settings')}>
              <Settings size={16} />
              <span>Settings</span>
            </Link>
          </li>
          <li>
            <Link href="/admin" onClick={() => onClose?.()} className={linkClass('/admin')}>
              <Shield size={16} />
              <span>Admin</span>
            </Link>
          </li>
          <li>
            <Link href="/staff" onClick={() => onClose?.()} className={linkClass('/staff')}>
              <User size={16} />
              <span>Staff</span>
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onClose?.();
                signOut({ callbackUrl: '/auth/sign-in' });
              }}
              className="flex items-center gap-3 px-2 py-2 transition hover:bg-muted/50"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
