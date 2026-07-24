"use client"
import React, { useEffect, useState } from 'react'

export default function InvoiceSettingsClient() {
  const [prefix, setPrefix] = useState('INV')
  const [footer, setFooter] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('invoice_settings')
      if (raw) {
        const obj = JSON.parse(raw)
        setPrefix(obj.prefix ?? 'INV')
        setFooter(obj.footer ?? '')
      }
    } catch {}
  }, [])

  function save() {
    localStorage.setItem('invoice_settings', JSON.stringify({ prefix, footer }))
    alert('Saved invoice settings')
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
          <button onClick={save} className="rounded bg-primary px-4 py-2 text-white">Save</button>
        </div>
      </div>
    </div>
  )
}
