"use client"
import React, { useEffect, useState } from 'react'
import { getSetting, saveSetting } from '@/lib/settings'

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

  async function save() {
    const payload = { name, address, phone, website }
    setSaving(true)

    const ok = await saveSetting('company_profile', payload).catch(() => false)
    if (ok) {
      alert('Saved company profile to server')
    } else {
      localStorage.setItem('company_profile', JSON.stringify(payload))
      alert('Saved company profile to localStorage')
    }

    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 mb-6">
        <h2 className="text-2xl font-semibold">Company Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your farm name and contact details used across the app and invoices.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-3">
          <label className="block text-sm">Company Name</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="block text-sm">Address</label>
          <textarea className="mt-1 w-full rounded border px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Phone</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Website</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <button disabled={saving} onClick={save} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
