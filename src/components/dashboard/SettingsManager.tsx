"use client"
import React, { useEffect, useState } from 'react'
import { useLocale } from '@/i18n/provider';

type Section = { key: string; title: string; description: string }

export default function SettingsManager() {
  const { dict } = useLocale();
  const DEFAULT_SECTIONS: Section[] = [
    { key: 'company', title: dict.settings.companyProfile, description: dict.settings.companyProfileDescription },
    { key: 'logo', title: dict.settings.logo, description: dict.settings.logoDescription },
    { key: 'invoice', title: dict.settings.invoiceSettings, description: dict.settings.invoiceSettingsDescription },
    { key: 'backup', title: dict.settings.backup, description: dict.settings.backupDescription },
    { key: 'restore', title: dict.settings.restore, description: dict.settings.restoreDescription },
    { key: 'users', title: dict.settings.users, description: dict.settings.usersDescription }
  ]
  const [sections] = useState<Section[]>(DEFAULT_SECTIONS)
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
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.settings.settingsCustomize}</p>
        <h2 className="mt-2 text-2xl font-semibold">{dict.settings.chooseSections}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{dict.settings.toggleSections}</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <div key={section.key} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold">{section.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={!!enabled[section.key]} onChange={() => toggle(section.key)} />
                <span className="text-sm">{dict.common.enabled}</span>
              </label>
              <a className="text-sm text-primary" href={`/dashboard/settings/${section.key}`}>{dict.common.configure}</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
