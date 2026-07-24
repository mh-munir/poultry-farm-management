"use client"
import React, { useRef } from 'react'

export default function RestoreSettingsClient() {
  const inputRef = useRef<HTMLInputElement | null>(null)

  function onRestore() {
    const file = inputRef.current?.files?.[0]
    if (!file) return alert('Choose a JSON backup file')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result))
        if (obj.company_profile) localStorage.setItem('company_profile', obj.company_profile)
        if (obj.branding) localStorage.setItem('branding', obj.branding)
        if (obj.invoice_settings) localStorage.setItem('invoice_settings', obj.invoice_settings)
        if (obj.dashboard_costs) localStorage.setItem('dashboard_costs', obj.dashboard_costs)
        alert('Restore completed (localStorage updated)')
      } catch (err) {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">Restore</h2>
        <p className="text-sm text-muted-foreground">Upload a previously exported JSON backup to restore settings locally.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <input ref={inputRef} type="file" accept="application/json" />
        <div className="mt-4">
          <button onClick={onRestore} className="rounded bg-primary px-4 py-2 text-white">Restore</button>
        </div>
      </div>
    </div>
  )
}
