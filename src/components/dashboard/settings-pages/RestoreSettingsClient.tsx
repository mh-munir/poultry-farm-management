"use client"
import React, { useState } from 'react'
import { saveSetting } from '@/lib/settings'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/provider'

export default function RestoreSettingsClient() {
  const [file, setFile] = useState<File | null>(null)
  const [restoring, setRestoring] = useState(false)

  const { success, error: showToastError } = useToast()
  const { dict } = useLocale()

  async function onRestore() {
    if (!file) {
      showToastError(dict.settings.chooseBackupFile)
      return
    }

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
          success(dict.settings.restoreCompleted.replace('{count}', String(restored)))
        } else {
          showToastError(dict.settings.restoreFailed)
        }
      } catch {
        showToastError(dict.settings.invalidJsonFile)
      }

      setRestoring(false)
    }

    reader.readAsText(file)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <div className="rounded-xl border bg-card p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold">{dict.settings.restore}</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">{dict.settings.restorePageDescription}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <input id="backup-file" type="file" accept="application/json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="sr-only" />
        <label htmlFor="backup-file" className="inline-flex cursor-pointer rounded border px-4 py-2 text-sm">{dict.settings.backupFileInput}</label>
        {file ? <p className="text-sm text-muted-foreground">{dict.settings.selectedFile}: {file.name}</p> : null}
        <button disabled={restoring} onClick={onRestore} className="w-full sm:w-auto rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{restoring ? dict.settings.restoringSettings : dict.settings.restore}</button>
      </div>
    </div>
  )
}
