"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminImageUploader from '@/components/admin-image-uploader'
import { getSetting, saveSetting } from '@/lib/settings'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/provider'

type BrandingValue = {
  logo?: string | null;
  name?: string;
  favicon?: string | null;
};

type LogoSettingsClientProps = {
  initialBranding?: BrandingValue | null;
};

export default function LogoSettingsClient({ initialBranding }: LogoSettingsClientProps) {
  const router = useRouter()
  const [logoUrl, setLogoUrl] = useState<string | null>(initialBranding?.logo ?? null)
  const [faviconUrl, setFaviconUrl] = useState<string | null>(initialBranding?.favicon ?? null)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [pendingFaviconFile, setPendingFaviconFile] = useState<File | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(initialBranding?.favicon ?? null)
  const [name, setName] = useState(initialBranding?.name ?? '')
  const [saving, setSaving] = useState(false)
  const { success: showToastSuccess, error: showToastError } = useToast()
  const { dict } = useLocale()

  useEffect(() => {
    async function load() {
      if (initialBranding) return;
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
  }, [initialBranding])

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
      showToastSuccess(dict.settings.brandingSaved)
      if (payload.favicon) {
        updateBrowserFavicon(payload.favicon)
      }
      router.refresh()
    } else {
      showToastError(dict.settings.brandingSaveFailed)
      localStorage.setItem('branding', JSON.stringify(payload))
    }

    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">{dict.settings.logoTitle}</h2>
        <p className="text-sm text-muted-foreground">{dict.settings.logoPageDescription}</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4">
          <label className="block text-sm">{dict.settings.displayName}</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">{dict.settings.logoPreview}</label>
          <AdminImageUploader
            inputId="logoImageFile"
            existingImageUrl={logoUrl ?? undefined}
            onFileSelected={(f) => setPendingLogoFile(f)}
            onImageUploaded={(url) => {
              setLogoUrl(url)
              setPendingLogoFile(null)
            }}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2">{dict.settings.favicon}</label>
          {faviconPreview ? (
            <img src={faviconPreview} alt={dict.settings.faviconPreview} className="h-12 w-12 object-contain border rounded mb-2" />
          ) : (
            <div className="h-12 w-12 rounded border bg-muted text-muted-foreground flex items-center justify-center mb-2 text-xs">{dict.settings.noFavicon}</div>
          )}
          <AdminImageUploader
            inputId="faviconImageFile"
            existingImageUrl={faviconPreview ?? undefined}
            onFileSelected={(f) => handleFaviconFileSelected(f)}
            onImageUploaded={(url) => {
              setFaviconUrl(url)
              setFaviconPreview(url)
              setPendingFaviconFile(null)
            }}
          />
          <p className="mt-1 text-xs text-muted-foreground">{dict.settings.acceptedImageTypes}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button disabled={saving} onClick={save} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? dict.settings.savingSettings : dict.common.save}</button>
          <div className="text-sm text-muted-foreground">{dict.settings.brandingServerNote}</div>
        </div>
      </div>
    </div>
  )
}
