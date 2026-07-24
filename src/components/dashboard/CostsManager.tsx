"use client"
import React, { useEffect, useState } from 'react'

type Cost = { id: string; description: string; amount: number; date: string }

const STORAGE_KEY = 'dashboard_costs'

function todayDateStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function CostsManager() {
  const [costs, setCosts] = useState<Cost[]>([])
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [date, setDate] = useState(todayDateStr())

  useEffect(() => {
    // Try server first, fallback to localStorage
    fetch('/api/costs')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCosts(data.map((c: any) => ({ id: String(c.id), description: c.description ?? '', amount: Number(c.amount), date: (c.costDate || c.date || '').slice?.(0, 10) ?? new Date(c.costDate || c.date || Date.now()).toISOString().slice(0,10) })))
        } else {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) setCosts(JSON.parse(raw))
        }
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) setCosts(JSON.parse(raw))
        } catch {}
      })
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(costs))
  }, [costs])

  function addCost(e?: React.FormEvent) {
    e?.preventDefault()
    if (!desc || !amount) return
    const newItem: Cost = { id: String(Date.now()), description: desc, amount: Number(amount), date }
    // Try to persist to server, fall back to local state/localStorage
    fetch('/api/costs', { method: 'POST', body: JSON.stringify({ amount: Number(amount), description: desc, date }), headers: { 'Content-Type': 'application/json' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('server error')
        const created = await res.json()
        const item: Cost = { id: String(created.id), description: created.description ?? desc, amount: Number(created.amount), date: (created.costDate || created.date || date).slice?.(0,10) ?? date }
        setCosts((s) => [item, ...s])
      })
      .catch(() => {
        setCosts((s) => [newItem, ...s])
      })
    setDesc('')
    setAmount('')
    setDate(todayDateStr())
  }

  function removeCost(id: string) {
    setCosts((s) => s.filter((c) => c.id !== id))
  }

  const total = costs.reduce((s, c) => s + c.amount, 0)
  const today = costs.filter((c) => c.date === todayDateStr()).reduce((s, c) => s + c.amount, 0)

  return (
    <div>
      <div className="rounded-xl border bg-card p-6 shadow-sm mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Costs</p>
        <h2 className="mt-2 text-2xl font-semibold">Add a cost</h2>
        <p className="mt-2 text-sm text-muted-foreground">Record daily expenses; totals will update for today and overall.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <form onSubmit={addCost} className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-3">
              <label className="block text-sm">Description</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </div>
            <div className="mb-3">
              <label className="block text-sm">Amount</label>
              <input value={amount as any} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} type="number" step="0.01" className="mt-1 w-full rounded border px-3 py-2" />
            </div>
            <div className="mb-3">
              <label className="block text-sm">Date</label>
              <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="mt-1 w-full rounded border px-3 py-2" />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="rounded bg-primary px-4 py-2 text-white">Add cost</button>
              <button type="button" onClick={() => { setDesc(''); setAmount(''); setDate(todayDateStr()) }} className="rounded border px-4 py-2">Reset</button>
            </div>
          </form>

          <div className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-lg font-semibold">All Costs</h3>
            <div className="mt-3 space-y-3">
              {costs.length === 0 ? <div className="text-sm text-muted-foreground">No costs recorded yet.</div> : null}
              {costs.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b py-2">
                  <div>
                    <div className="font-medium">{c.description}</div>
                    <div className="text-xs text-muted-foreground">{c.date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">{c.amount.toFixed(2)}</div>
                    <button onClick={() => removeCost(c.id)} className="text-sm text-rose-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h4 className="text-sm text-muted-foreground">Today's cost</h4>
            <div className="mt-2 text-2xl font-semibold">{today.toFixed(2)}</div>
          </div>

          <div className="mt-4 rounded-xl border bg-card p-6 shadow-sm">
            <h4 className="text-sm text-muted-foreground">Total cost</h4>
            <div className="mt-2 text-2xl font-semibold">{total.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
