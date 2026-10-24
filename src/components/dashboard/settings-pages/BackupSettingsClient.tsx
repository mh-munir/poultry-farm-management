"use client"
import React, { useState } from 'react'
import { getAllSettings } from '@/lib/settings'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/provider'

export default function BackupSettingsClient() {
  const [downloading, setDownloading] = useState(false)
  const { error: showToastError, success } = useToast()
  const { dict } = useLocale()

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
      success(dict.settings.backupDownloaded)
    } catch (error) {
      console.error('Backup generation failed', error)
      showToastError(dict.settings.backupFailed)
    }
    setDownloading(false)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <div className="rounded-xl border bg-card p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold">{dict.settings.backup}</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">{dict.settings.backupPageDescription}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <button disabled={downloading} onClick={downloadBackup} className="w-full sm:w-auto rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{downloading ? dict.settings.preparingBackup : dict.settings.downloadBackup}</button>
      </div>
    </div>
  )
}
