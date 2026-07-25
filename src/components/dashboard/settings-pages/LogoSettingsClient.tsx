"use client"
import React, { useEffect, useState } from 'react'
import AdminImageUploader from '@/components/admin-image-uploader'
import { getSetting, saveSetting } from '@/lib/settings'

export default function LogoSettingsClient() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const value = await getSetting('branding')
        if (value) {
          setLogoUrl(value.logo ?? null)
          setName(value.name ?? '')
          return
        }
      } catch {}

      try {
        const raw = localStorage.getItem('branding')
        if (raw) {
          const obj = JSON.parse(raw)
          setLogoUrl(obj.logo ?? null)
          setName(obj.name ?? '')
        }
      } catch {}
    }

    load()
  }, [])

  async function save() {
    setSaving(true)
    const payload = { logo: logoUrl, name }

    if (pendingFile) {
      try {
        const fd = new FormData()
        fd.append('imageFile', pendingFile)
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (res.ok && data?.url) {
          payload.logo = data.url
          setLogoUrl(data.url)
        }
      } catch {}
    }

    const ok = await saveSetting('branding', payload).catch(() => false)
    if (ok) {
      alert('Saved branding to server')
    } else {
      localStorage.setItem('branding', JSON.stringify(payload))
      alert('Saved branding to localStorage')
    }

    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">Logo & Branding</h2>
        <p className="text-sm text-muted-foreground">Upload a logo or set a display name used in invoices and the app header.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4">
          <label className="block text-sm">Display Name</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">Logo (preview)</label>
          <AdminImageUploader existingImageUrl={logoUrl ?? undefined} onFileSelected={(f) => setPendingFile(f)} />
        </div>

        <div className="flex items-center gap-3">
          <button disabled={saving} onClick={save} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          <div className="text-sm text-muted-foreground">The branding settings are stored on the server and used by invoices.</div>
        </div>
      </div>
    </div>
  )
}
