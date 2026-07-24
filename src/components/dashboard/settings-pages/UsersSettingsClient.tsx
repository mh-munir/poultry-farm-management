"use client"
import React from 'react'

export default function UsersSettingsClient() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">Manage staff accounts. For full account management, use the Admin panel (Admin → Update credentials) or implement server-backed user management here.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="text-sm text-muted-foreground">This page is a placeholder. User creation, role assignment, and password resets are handled in the Admin area or via server APIs.</div>
      </div>
    </div>
  )
}
