"use client"
import React, { useEffect, useState } from 'react'

export default function PermissionsSettingsClient() {
  const [perms, setPerms] = useState<string[]>([])
  const [newPerm, setNewPerm] = useState('')

  useEffect(() => { try { const raw = localStorage.getItem('permissions'); if (raw) setPerms(JSON.parse(raw)) } catch {} }, [])

  function addPerm() {
    if (!newPerm) return
    const next = [newPerm, ...perms]
    setPerms(next)
    localStorage.setItem('permissions', JSON.stringify(next))
    setNewPerm('')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">Permissions</h2>
        <p className="text-sm text-muted-foreground">Create permission keys and later map them to roles or UI actions.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-3">
          <label className="block text-sm">New Permission Key</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={newPerm} onChange={(e) => setNewPerm(e.target.value)} />
        </div>
        <div>
          <button onClick={addPerm} className="rounded bg-primary px-4 py-2 text-white">Add Permission</button>
        </div>

        <div className="mt-4">
          {perms.map((p) => (
            <div key={p} className="flex items-center justify-between border-b py-2">{p}</div>
          ))}
          {perms.length === 0 ? <div className="text-sm text-muted-foreground mt-2">No permissions defined yet.</div> : null}
        </div>
      </div>
    </div>
  )
}
