"use client"
import React, { useEffect, useState } from 'react'
import AdminImageUploader from '@/components/admin-image-uploader'

export default function LogoSettingsClient() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('branding')
      if (raw) {
        const obj = JSON.parse(raw)
        setLogoUrl(obj.logo ?? null)
        setName(obj.name ?? '')
      }
    } catch {}
  }, [])

  async function save() {
    const payload = { logo: logoUrl, name }

    // If there's a selected file, upload it first
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

    // Try to save to server, fall back to localStorage
    try {
      const r = await fetch('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'branding', value: payload }), headers: { 'Content-Type': 'application/json' } })
      if (r.ok) {
        alert('Saved branding to server')
        return
      }
    } catch {}

    localStorage.setItem('branding', JSON.stringify(payload))
    alert('Saved branding to localStorage')
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
          <button onClick={save} className="rounded bg-primary px-4 py-2 text-white">Save</button>
          <div className="text-sm text-muted-foreground">Note: The file input is preview-only. To persist uploads to server, use Admin → Update credentials.</div>
        </div>
      </div>
    </div>
  )
}
