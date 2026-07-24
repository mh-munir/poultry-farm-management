"use client"
import React from 'react'

export default function BackupSettingsClient() {
  function downloadBackup() {
    const all = {
      company_profile: localStorage.getItem('company_profile'),
      branding: localStorage.getItem('branding'),
      invoice_settings: localStorage.getItem('invoice_settings'),
      dashboard_costs: localStorage.getItem('dashboard_costs')
    }
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `poultry-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">Backup</h2>
        <p className="text-sm text-muted-foreground">Download a JSON backup of local settings stored in your browser.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <button onClick={downloadBackup} className="rounded bg-primary px-4 py-2 text-white">Download Backup</button>
      </div>
    </div>
  )
}
