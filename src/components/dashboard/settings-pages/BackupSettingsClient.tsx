"use client"
import React, { useState } from 'react'
import { getAllSettings } from '@/lib/settings'

export default function BackupSettingsClient() {
  const [downloading, setDownloading] = useState(false)

  async function downloadBackup() {
    setDownloading(true)
    try {
      const all = await getAllSettings()
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `poultry-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('Unable to generate backup from server settings.')
    }
    setDownloading(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">Backup</h2>
        <p className="text-sm text-muted-foreground">Download a JSON backup of your server-backed settings.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <button disabled={downloading} onClick={downloadBackup} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{downloading ? 'Preparing backup...' : 'Download Backup'}</button>
      </div>
    </div>
  )
}
