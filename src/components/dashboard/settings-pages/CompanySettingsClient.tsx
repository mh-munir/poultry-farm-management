"use client"
import React, { useEffect, useState } from 'react'

export default function CompanySettingsClient() {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')

  useEffect(() => {
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
  }, [])

  function save() {
    const payload = { name, address, phone, website }
    // Try server persistence first, fall back to localStorage
    fetch('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'company_profile', value: payload }), headers: { 'Content-Type': 'application/json' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('server error')
        alert('Saved company profile to server')
      })
      .catch(() => {
        localStorage.setItem('company_profile', JSON.stringify(payload))
        alert('Saved company profile to localStorage')
      })
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
          <button onClick={save} className="rounded bg-primary px-4 py-2 text-white">Save</button>
        </div>
      </div>
    </div>
  )
}
