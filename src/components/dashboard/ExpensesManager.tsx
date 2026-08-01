"use client"
import React, { useEffect, useState } from 'react'
import { ResponsiveTable } from '@/components/ui/responsive-table'

type Expense = { id: string; description: string; amount: number; date: string }

const STORAGE_KEY = 'dashboard_expenses'

function todayDateStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(value + 'T00:00:00')
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function ExpensesManager() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [date, setDate] = useState(todayDateStr())

  useEffect(() => {
    fetch('/api/expenses')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setExpenses(data.map((c: any) => ({ id: String(c.id), description: c.description ?? '', amount: Number(c.amount), date: (c.expenseDate || c.date || '').slice?.(0, 10) ?? new Date(c.expenseDate || c.date || Date.now()).toISOString().slice(0,10) })))
        } else {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) setExpenses(JSON.parse(raw))
        }
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) setExpenses(JSON.parse(raw))
        } catch {}
      })
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  }, [expenses])

  function addExpense(e?: React.FormEvent) {
    e?.preventDefault()
    if (!desc || !amount) return
    const newItem: Expense = { id: String(Date.now()), description: desc, amount: Number(amount), date }
    fetch('/api/expenses', { method: 'POST', body: JSON.stringify({ amount: Number(amount), description: desc, date }), headers: { 'Content-Type': 'application/json' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('server error')
        const created = await res.json()
        const item: Expense = { id: String(created.id), description: created.description ?? desc, amount: Number(created.amount), date: (created.expenseDate || created.date || date).slice?.(0,10) ?? date }
        setExpenses((s) => [item, ...s])
      })
      .catch(() => {
        setExpenses((s) => [newItem, ...s])
      })
    setDesc('')
    setAmount('')
    setDate(todayDateStr())
  }

  const total = expenses.reduce((s, c) => s + c.amount, 0)
  const today = expenses.filter((c) => c.date === todayDateStr()).reduce((s, c) => s + c.amount, 0)

  return (
    <div>
      <div className="rounded-xl border bg-card p-6 shadow-sm mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Expenses</p>
        <h2 className="mt-2 text-2xl font-semibold">Add an expense</h2>
        <p className="mt-2 text-sm text-muted-foreground">Record daily expenses; totals will update for today and overall.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <form onSubmit={addExpense} className="rounded-xl border bg-card p-6 shadow-sm">
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
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="rounded bg-primary px-4 py-2 text-white">Add expense</button>
              <button type="button" onClick={() => { setDesc(''); setAmount(''); setDate(todayDateStr()) }} className="rounded border px-4 py-2">Reset</button>
            </div>
          </form>

          <div className="mt-6 rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">All Expenses</h3>
            </div>
            {expenses.length === 0 ? (
              <div className="px-6 py-8 text-sm text-muted-foreground text-center">No expenses recorded yet.</div>
            ) : (
              <>
                <ResponsiveTable minWidth="640px">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Description</th>
                        <th className="px-6 py-3 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expenses.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(c.date)}
                          </td>
                          <td className="px-6 py-3">
                            <div className="font-medium">{c.description}</div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="font-semibold">৳ {c.amount.toFixed(2)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ResponsiveTable>
                <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total</span>
                  <span className="text-sm font-semibold">৳ {total.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h4 className="text-sm text-muted-foreground">Today's expense</h4>
            <div className="mt-2 text-2xl font-semibold">{today.toFixed(2)}</div>
          </div>

          <div className="mt-4 rounded-xl border bg-card p-6 shadow-sm">
            <h4 className="text-sm text-muted-foreground">Total expense</h4>
            <div className="mt-2 text-2xl font-semibold">{total.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
