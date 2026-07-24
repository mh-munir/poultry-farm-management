"use client"
import React, { useEffect, useState } from 'react'

type Section = { key: string; title: string; description: string }

const DEFAULT_SECTIONS: Section[] = [
  { key: 'company', title: 'Company Profile', description: 'Manage the farm name, address, contact details, and business identity.' },
  { key: 'logo', title: 'Logo', description: 'Upload and manage branding assets used on invoices and reports.' },
  { key: 'invoice', title: 'Invoice Settings', description: 'Configure invoice numbering, footer notes, and document formatting.' },
  { key: 'backup', title: 'Backup', description: 'Create scheduled or manual backups for your farm data.' },
  { key: 'restore', title: 'Restore', description: 'Restore previous data snapshots safely when needed.' },
  { key: 'users', title: 'Users', description: 'Manage user accounts and their access to the system.' },
  { key: 'roles', title: 'Roles', description: 'Create role-based access groups for different responsibilities.' },
  { key: 'permissions', title: 'Permissions', description: 'Fine-tune what each role can create, edit, view, or approve.' }
]

export default function SettingsManager() {
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS)
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // load enabled map from localStorage (per admin browser). Defaults: all true.
    const raw = localStorage.getItem('settings_sections_enabled')
    if (raw) {
      try {
        setEnabled(JSON.parse(raw))
      } catch {
        setEnabled(Object.fromEntries(DEFAULT_SECTIONS.map((s) => [s.key, true])))
      }
    } else {
      setEnabled(Object.fromEntries(DEFAULT_SECTIONS.map((s) => [s.key, true])))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('settings_sections_enabled', JSON.stringify(enabled))
  }, [enabled])

  function toggle(key: string) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div>
      <div className="rounded-xl border bg-card p-6 shadow-sm mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Settings (Customize)</p>
        <h2 className="mt-2 text-2xl font-semibold">Choose which sections appear</h2>
        <p className="mt-2 text-sm text-muted-foreground">Toggle the sections below to show or hide them on the settings dashboard.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <div key={section.key} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold">{section.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={!!enabled[section.key]} onChange={() => toggle(section.key)} />
                <span className="text-sm">Enabled</span>
              </label>
              <a className="text-sm text-primary" href={`/dashboard/settings/${section.key}`}>Configure</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
