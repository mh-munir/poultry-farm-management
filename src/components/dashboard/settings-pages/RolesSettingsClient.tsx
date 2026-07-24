"use client"
import React, { useEffect, useState } from 'react'

export default function RolesSettingsClient() {
  const [roles, setRoles] = useState<string[]>([])
  const [newRole, setNewRole] = useState('')

  useEffect(() => {
    try { const raw = localStorage.getItem('roles'); if (raw) setRoles(JSON.parse(raw)) } catch {}
  }, [])

  function addRole() {
    if (!newRole) return
    const next = [newRole, ...roles]
    setRoles(next)
    localStorage.setItem('roles', JSON.stringify(next))
    setNewRole('')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">Roles</h2>
        <p className="text-sm text-muted-foreground">Create or manage lightweight roles used for permission grouping.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-3">
          <label className="block text-sm">New Role</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={newRole} onChange={(e) => setNewRole(e.target.value)} />
        </div>
        <div>
          <button onClick={addRole} className="rounded bg-primary px-4 py-2 text-white">Add Role</button>
        </div>

        <div className="mt-4">
          {roles.map((r) => (
            <div key={r} className="flex items-center justify-between border-b py-2">
              <div>{r}</div>
            </div>
          ))}
          {roles.length === 0 ? <div className="text-sm text-muted-foreground mt-2">No roles created yet.</div> : null}
        </div>
      </div>
    </div>
  )
}
