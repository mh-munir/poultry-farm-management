"use client"
import React, { useEffect, useState } from 'react'
import AdminImageUploader from '@/components/admin-image-uploader'
import { getSetting, saveSetting } from '@/lib/settings'
import { useToast } from '@/hooks/use-toast'

export default function LogoSettingsClient() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [pendingFaviconFile, setPendingFaviconFile] = useState<File | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const { success: showToastSuccess, error: showToastError } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const value = await getSetting('branding')
        if (value) {
          setLogoUrl(value.logo ?? null)
          setFaviconUrl(value.favicon ?? null)
          setFaviconPreview(value.favicon ?? null)
          setName(value.name ?? '')
          return
        }
      } catch {}

      try {
        const raw = localStorage.getItem('branding')
        if (raw) {
          const obj = JSON.parse(raw)
          setLogoUrl(obj.logo ?? null)
          setFaviconUrl(obj.favicon ?? null)
          setFaviconPreview(obj.favicon ?? null)
          setName(obj.name ?? '')
        }
      } catch {}
    }

    load()
  }, [])

  useEffect(() => {
    if (faviconUrl) {
      updateBrowserFavicon(faviconUrl)
    }
  }, [faviconUrl])

  function updateBrowserFavicon(url: string | null) {
    if (typeof document === 'undefined') return
    const link = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null
    if (link) {
      link.href = url ?? ''
      return
    }
    const newLink = document.createElement('link')
    newLink.rel = 'icon'
    newLink.href = url ?? ''
    document.head.appendChild(newLink)
  }

  function handleFaviconFileSelected(file: File | null) {
    if (!file) {
      setPendingFaviconFile(null)
      setFaviconPreview(faviconUrl ?? null)
      return
    }
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setFaviconPreview(url)
    setPendingFaviconFile(file)
  }

  async function save() {
    setSaving(true)
    const payload: { logo?: string | null; name: string; favicon?: string | null } = { logo: logoUrl, name }

    if (pendingLogoFile) {
      try {
        const fd = new FormData()
        fd.append('imageFile', pendingLogoFile)
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (res.ok && data?.url) {
          payload.logo = data.url
          setLogoUrl(data.url)
        }
      } catch {}
    }

    if (pendingFaviconFile) {
      try {
        const fd = new FormData()
        fd.append('imageFile', pendingFaviconFile)
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (res.ok && data?.url) {
          payload.favicon = data.url
          setFaviconUrl(data.url)
          setFaviconPreview(data.url)
        }
      } catch {}
    }

    const ok = await saveSetting('branding', payload).catch(() => false)

    if (ok) {
      showToastSuccess('Branding settings saved successfully.')
      if (payload.favicon) {
        updateBrowserFavicon(payload.favicon)
      }
    } else {
      showToastError('Failed to save settings.')
      localStorage.setItem('branding', JSON.stringify(payload))
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
          <AdminImageUploader existingImageUrl={logoUrl ?? undefined} onFileSelected={(f) => setPendingLogoFile(f)} />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">Favicon</label>
          {faviconPreview ? (
            <img src={faviconPreview} alt="Favicon preview" className="h-12 w-12 object-contain border rounded mb-2" />
          ) : (
            <div className="h-12 w-12 rounded border bg-muted text-muted-foreground flex items-center justify-center mb-2 text-xs">No favicon</div>
          )}
          <AdminImageUploader existingImageUrl={faviconPreview ?? undefined} onFileSelected={(f) => handleFaviconFileSelected(f)} />
          <p className="mt-1 text-xs text-muted-foreground">Accepted: PNG, JPEG, WebP, SVG, ICO</p>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={saving} onClick={save} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          <div className="text-sm text-muted-foreground">The branding settings are stored on the server and used by invoices and the app.</div>
        </div>
      </div>
    </div>
  )
}