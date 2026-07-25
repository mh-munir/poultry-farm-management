"use client"
import React, { useEffect, useState } from 'react'
import { getSetting, saveSetting } from '@/lib/settings'

export default function InvoiceSettingsClient() {
  const [prefix, setPrefix] = useState('INV')
  const [footer, setFooter] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const value = await getSetting('invoice_settings')
        if (value) {
          setPrefix(value.prefix ?? 'INV')
          setFooter(value.footer ?? '')
          return
        }
      } catch {}

      try {
        const raw = localStorage.getItem('invoice_settings')
        if (raw) {
          const obj = JSON.parse(raw)
          setPrefix(obj.prefix ?? 'INV')
          setFooter(obj.footer ?? '')
        }
      } catch {}
    }

    load()
  }, [])

  async function save() {
    setSaving(true)
    const value = { prefix, footer }
    const ok = await saveSetting('invoice_settings', value).catch(() => false)
    if (ok) {
      alert('Saved invoice settings to server')
    } else {
      localStorage.setItem('invoice_settings', JSON.stringify(value))
      alert('Saved invoice settings to localStorage')
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">Invoice Settings</h2>
        <p className="text-sm text-muted-foreground">Configure invoice numbering prefix and footer notes.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-3">
          <label className="block text-sm">Invoice Prefix</label>
          <input className="mt-1 w-48 rounded border px-3 py-2" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="block text-sm">Footer Note</label>
          <textarea className="mt-1 w-full rounded border px-3 py-2" value={footer} onChange={(e) => setFooter(e.target.value)} />
        </div>
        <div>
          <button disabled={saving} onClick={save} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
