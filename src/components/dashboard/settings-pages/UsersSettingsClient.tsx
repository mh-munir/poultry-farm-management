"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import AdminCredentialsForm from './AdminCredentialsForm'
import CreateAdminForm from './CreateAdminForm'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ResponsiveTable } from '@/components/ui/responsive-table'

type Props = {
  initialName: string;
  initialEmail: string;
  initialImage: string;
  users: Array<{ id: string; name: string | null; email: string | null; role: string }>;
  isSuperAdmin?: boolean;
}

export default function UsersSettingsClient({ initialName, initialEmail, initialImage, users, isSuperAdmin }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'account' | 'users'>('account')
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)

  function handleAdminCreated() {
    setShowCreateAdmin(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage administrator account and user access.</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${activeTab === 'account' ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Admin Account
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${activeTab === 'users' ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Users
        </button>
      </div>

      {activeTab === 'account' ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin Account</p>
            <h2 className="mt-2 text-2xl font-semibold">Administrator account</h2>
            <p className="mt-2 text-sm text-muted-foreground">Update the admin name, image, email or password below.</p>
          </div>

          <AdminCredentialsForm currentName={initialName} currentEmail={initialEmail} currentImage={initialImage} />
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Users</p>
              <h2 className="mt-2 text-2xl font-semibold">User accounts</h2>
            </div>
            {isSuperAdmin && (
              <Button type="button" onClick={() => setShowCreateAdmin(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Admin
              </Button>
            )}
          </div>

          {users.length > 0 ? (
            <ResponsiveTable minWidth="640px">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t">
                      <td className="px-3 py-3">{user.name ?? '-'}</td>
                      <td className="px-3 py-3">{user.email ?? '-'}</td>
                      <td className="px-3 py-3">{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          ) : (
            <p className="text-sm text-muted-foreground">No user accounts found.</p>
          )}
        </div>
      )}

      {isSuperAdmin && (
        <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin} title="Create New Admin">
          <CreateAdminForm onAdminCreated={handleAdminCreated} />
        </Dialog>
      )}
    </div>
  )
}
