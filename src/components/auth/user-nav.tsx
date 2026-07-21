'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { Bell, LifeBuoy, Lock, Settings, User, LogOut } from 'lucide-react';

export function UserNav() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!session?.user) {
    return (
      <Link href="/auth/sign-in" className="rounded-full border px-4 py-2 text-sm hover:bg-muted/50">
        Sign in
      </Link>
    );
  }

  const role = session.user.role ?? 'USER';
  const name = session.user.name ?? 'Admin';
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-muted/40 bg-surface text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/50"
        aria-label="Open user menu"
      >
        {session.user.image ? (
          <img src={session.user.image} alt={name} className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-700 ring-1 ring-cyan-200">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{role}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Welcome back 👋</p>
          </div>

          <div className="divide-y divide-slate-200">
            <div className="space-y-1 px-2 py-3">
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-slate-700 transition hover:bg-slate-100">
                <User size={16} className="text-slate-500" />
                <span>Profile</span>
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-slate-700 transition hover:bg-slate-100">
                <Bell size={16} className="text-slate-500" />
                <span>Notifications</span>
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-slate-700 transition hover:bg-slate-100">
                <Settings size={16} className="text-slate-500" />
                <span>Account Settings</span>
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-slate-700 transition hover:bg-slate-100">
                <LifeBuoy size={16} className="text-slate-500" />
                <span>Support Center</span>
              </button>
            </div>

            <div className="space-y-1 px-2 py-3">
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-slate-700 transition hover:bg-slate-100">
                <Lock size={16} className="text-slate-500" />
                <span>Lock Screen</span>
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/auth/sign-in' })}
                className="flex w-full items-center gap-3 rounded-2xl bg-rose-600 px-3 py-3 text-left text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                <LogOut size={16} className="text-white" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
