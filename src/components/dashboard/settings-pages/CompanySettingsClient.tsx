"use client"
import React, { useEffect, useState } from 'react'
import { getSetting, saveSetting } from '@/lib/settings'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/provider'

export default function CompanySettingsClient() {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const value = await getSetting('company_profile')
        if (value) {
          setName(value.name ?? '')
          setAddress(value.address ?? '')
          setPhone(value.phone ?? '')
          setWebsite(value.website ?? '')
          return
        }
      } catch {}

      try {
        const raw = localStorage.getItem('company_profile')
        if (raw) {
          const obj = JSON.parse(raw)
          setName(obj.name ?? '')
          setAddress(obj.address ?? '')
          setPhone(obj.phone ?? '')
          setWebsite(obj.website ?? '')
        }
      } catch {}
    }

    load()
  }, [])

  const { success, error: showToastError } = useToast()
  const { dict } = useLocale()

  async function save() {
    const payload = { name, address, phone, website }
    setSaving(true)

    const ok = await saveSetting('company_profile', payload).catch(() => false)
    if (ok) {
      success(dict.settings.savedCompanyProfile ?? 'Saved company profile to server')
    } else {
      localStorage.setItem('company_profile', JSON.stringify(payload))
      success(dict.settings.savedCompanyProfileLocal ?? 'Saved company profile to localStorage')
    }

    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">{dict.settings.companyProfile}</h2>
        <p className="text-sm text-muted-foreground">{dict.settings.companyProfileDescription}</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-3">
          <label className="block text-sm">{dict.common.companyName}</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="block text-sm">{dict.settings.address}</label>
          <textarea className="mt-1 w-full rounded border px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">{dict.settings.phone}</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">{dict.settings.website ?? 'Website'}</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={saving} onClick={save} className="w-full sm:w-auto rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? dict.common.processing : dict.common.save}</button>
        </div>
      </div>
    </div>
  )
}
