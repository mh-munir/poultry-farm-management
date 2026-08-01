"use client"
import React, { useState } from 'react'
import { saveSetting } from '@/lib/settings'

export default function RestoreSettingsClient() {
  const [file, setFile] = useState<File | null>(null)
  const [restoring, setRestoring] = useState(false)

  async function onRestore() {
    if (!file) return alert('Choose a JSON backup file')
    setRestoring(true)

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const obj = JSON.parse(String(reader.result))
        const entries = Object.entries(obj)
        let restored = 0

        for (const [key, value] of entries) {
          const ok = await saveSetting(key, value).catch(() => false)
          if (ok) restored += 1
        }

        if (restored > 0) {
          alert(`Restore completed for ${restored} settings keys.`)
        } else {
          alert('Restore failed. No settings were saved to the server.')
        }
      } catch (err) {
        alert('Invalid JSON file')
      }

      setRestoring(false)
    }

    reader.readAsText(file)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <div className="rounded-xl border bg-card p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold">Restore</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Upload a previously exported JSON backup to restore your server-backed settings.</p>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <input type="file" accept="application/json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full" />
        <button disabled={restoring} onClick={onRestore} className="w-full sm:w-auto rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{restoring ? 'Restoring...' : 'Restore'}</button>
      </div>
    </div>
  )
}
