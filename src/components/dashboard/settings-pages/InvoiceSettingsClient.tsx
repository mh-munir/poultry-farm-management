"use client"
import React, { useEffect, useState } from 'react'
import { getSetting, saveSetting } from '@/lib/settings'

type InvoiceSettings = {
  prefix?: string
  footer?: string
  hideFeedUnitPrice?: boolean
  hideFeedLineTotal?: boolean
}

export default function InvoiceSettingsClient() {
  const [prefix, setPrefix] = useState('INV')
  const [footer, setFooter] = useState('')
  const [hideFeedUnitPrice, setHideFeedUnitPrice] = useState(false)
  const [hideFeedLineTotal, setHideFeedLineTotal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const value = await getSetting('invoice_settings')
        if (value) {
          setPrefix(value.prefix ?? 'INV')
          setFooter(value.footer ?? '')
          setHideFeedUnitPrice(Boolean(value.hideFeedUnitPrice))
          setHideFeedLineTotal(Boolean(value.hideFeedLineTotal))
          return
        }
      } catch {}

      try {
        const raw = localStorage.getItem('invoice_settings')
        if (raw) {
          const obj = JSON.parse(raw) as InvoiceSettings
          setPrefix(obj.prefix ?? 'INV')
          setFooter(obj.footer ?? '')
          setHideFeedUnitPrice(Boolean(obj.hideFeedUnitPrice))
          setHideFeedLineTotal(Boolean(obj.hideFeedLineTotal))
        }
      } catch {}
    }

    load()
  }, [])

  async function save() {
    setSaving(true)
    const value: InvoiceSettings = { prefix, footer, hideFeedUnitPrice, hideFeedLineTotal }
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
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <div className="rounded-xl border bg-card p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold">Invoice Settings</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Configure invoice numbering prefix and footer notes.</p>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="mb-3 sm:mb-4">
          <label className="block text-sm">Invoice Prefix</label>
          <input className="mt-1 w-full sm:w-48 rounded border px-3 py-2" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
        </div>
        <div className="mb-3 sm:mb-4">
          <label className="block text-sm">Footer Note</label>
          <textarea className="mt-1 w-full rounded border px-3 py-2" value={footer} onChange={(e) => setFooter(e.target.value)} />
        </div>

        <div className="mb-4 rounded-lg border bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold">Feed product display</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hideFeedUnitPrice}
                onChange={(e) => setHideFeedUnitPrice(e.target.checked)}
              />
              Hide Feed Unit Price
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hideFeedLineTotal}
                onChange={(e) => setHideFeedLineTotal(e.target.checked)}
              />
              Hide Feed Line Total
            </label>
          </div>
        </div>

        <div>
          <button disabled={saving} onClick={save} className="w-full sm:w-auto rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
