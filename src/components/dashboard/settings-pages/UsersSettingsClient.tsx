"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { useLocale } from '@/i18n/provider'
import AdminCredentialsForm from './AdminCredentialsForm'
import CreateAdminForm from './CreateAdminForm'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { deleteAdminUser } from '@/app/dashboard/settings/users/actions'

type ManagedUser = { id: string; name: string | null; email: string | null; phone: string | null; role: string; createdAt: Date }
type Props = { initialName: string; initialEmail: string; initialImage: string; users: ManagedUser[]; isSuperAdmin?: boolean }

export default function UsersSettingsClient({ initialName, initialEmail, initialImage, users, isSuperAdmin }: Props) {
  const router = useRouter()
  const { dict } = useLocale()
  const { success: showSuccess, error: showError } = useToast()
  const [activeTab, setActiveTab] = useState<'account' | 'users'>('account')
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [usersPage, setUsersPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize))
  const visibleUsers = users.slice((usersPage - 1) * pageSize, usersPage * pageSize)

  function handleAdminCreated() {
    setShowCreateAdmin(false)
    router.refresh()
  }

  async function handleDeleteAdmin() {
    if (!userToDelete) return
    setIsDeleting(true)
    const result = await deleteAdminUser(userToDelete.id)
    setIsDeleting(false)
    if (result.error) return showError(result.error)
    showSuccess(result.success ?? dict.settings.adminUserDeletedSuccess)
    setUserToDelete(null)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{dict.settings.systemSettings}</h1>
        <p className="mt-2 text-sm text-slate-500">{dict.settings.settingsCustomize}</p>
      </div>

      <div className="mb-5 flex gap-2 border-b border-slate-200">
        <button type="button" onClick={() => setActiveTab('account')} className={`rounded-t-xl px-5 py-3 text-sm font-semibold transition ${activeTab === 'account' ? 'border-b-2 border-green-600 bg-green-50 text-green-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>{dict.settings.adminAccountTab}</button>
        <button type="button" onClick={() => setActiveTab('users')} className={`rounded-t-xl px-5 py-3 text-sm font-semibold transition ${activeTab === 'users' ? 'border-b-2 border-green-600 bg-green-50 text-green-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>{dict.settings.usersTab}</button>
      </div>

      {activeTab === 'account' ? (
        <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-green-700">{dict.settings.adminAccount}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{dict.settings.administratorAccount}</h2>
              <p className="mt-2 text-sm text-slate-500">{dict.settings.manageProfileSecurity}</p>
            </div>
            {isSuperAdmin && <Button type="button" onClick={() => setShowCreateAdmin(true)}><UserPlus className="mr-2 h-4 w-4" />{dict.settings.createAdmin}</Button>}
          </div>
          <AdminCredentialsForm currentName={initialName} currentEmail={initialEmail} currentImage={initialImage} />
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6"><p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.settings.usersTab}</p><h2 className="mt-2 text-2xl font-semibold">{dict.settings.userAccounts}</h2></div>
          {users.length ? <><ResponsiveTable minWidth="900px"><table className="min-w-full text-sm"><thead className="bg-muted/40 text-left"><tr><th className="px-3 py-3 font-medium">{dict.common.profile}</th><th className="px-3 py-3 font-medium">{dict.common.email}</th><th className="px-3 py-3 font-medium">{dict.settings.mobileNumber}</th><th className="px-3 py-3 font-medium">{dict.settings.role ?? 'Role'}</th><th className="px-3 py-3 font-medium">{dict.settings.created ?? 'Created'}</th><th className="px-3 py-3 font-medium">{dict.common.actions}</th></tr></thead><tbody>{visibleUsers.map((user) => <tr key={user.id} className="border-t"><td className="px-3 py-3">{user.name ?? '-'}</td><td className="px-3 py-3">{user.email ?? '-'}</td><td className="px-3 py-3">{user.phone ?? '-'}</td><td className="px-3 py-3">{user.role}</td><td className="px-3 py-3">{new Date(user.createdAt).toLocaleDateString()}</td><td className="px-3 py-3">{isSuperAdmin && user.role === 'ADMIN' ? <Button type="button" variant="destructive" size="sm" onClick={() => setUserToDelete(user)}>{dict.common.delete}</Button> : <span className="text-muted-foreground">—</span>}</td></tr>)}</tbody></table></ResponsiveTable><Pagination currentPage={usersPage} totalPages={totalPages} onPageChange={setUsersPage} className="mt-4" /></> : <div className="rounded-xl border border-dashed p-8 text-center"><p className="text-base font-medium">{dict.settings.noAdminUsersFound}</p><p className="mt-1 text-sm text-muted-foreground">{dict.settings.createAdminToGrantAccess}</p></div>}
        </div>
      )}

      {isSuperAdmin && <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin} title={dict.settings.createNewAdmin}><CreateAdminForm onAdminCreated={handleAdminCreated} /></Dialog>}
      <ConfirmDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)} title={dict.settings.deleteAdminUser} description={dict.settings.deleteAdminDescription.replace('{name}', userToDelete?.name ?? userToDelete?.email ?? 'this Admin user')} confirmText={dict.settings.deleteAdmin} onConfirm={handleDeleteAdmin} isLoading={isDeleting} />
    </div>
  )
}
