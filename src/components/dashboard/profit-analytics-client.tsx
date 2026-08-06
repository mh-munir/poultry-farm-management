'use client'

import React, { useEffect, useState } from 'react';
import type { TopProductRow } from '@/features/dashboard/actions';

type Summary = {
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
};

type ApiResponse = {
  summary: Summary;
  pieChart: { profit: number; cost: number };
  topProducts: TopProductRow[];
};

const formatCurrency = (v: number) => `৳ ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)}`;

function toISODate(d: Date) {
  return d.toISOString();
}

export default function ProfitAnalyticsClient({ initialStart, initialEnd, initialData }: { initialStart: string; initialEnd: string; initialData: ApiResponse }) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [data, setData] = useState<ApiResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setData(initialData ?? null);
  }, [initialData]);

  async function fetchRange(s: string, e: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/profit?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json as ApiResponse);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function setPreset(days: number | 'month' | 'lastMonth' | 'year' | 'yesterday') {
    const now = new Date();
    let s: Date, e: Date;
    if (days === 'month') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
    } else if (days === 'lastMonth') {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
    } else if (days === 'year') {
      s = new Date(now.getFullYear(), 0, 1);
      e = new Date(now.getFullYear() + 1, 0, 1);
    } else if (days === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      s = new Date(y.getFullYear(), y.getMonth(), y.getDate());
      e = new Date(s);
      e.setDate(e.getDate() + 1);
    } else {
      s = new Date();
      s.setDate(s.getDate() - (days as number) + 1);
      s.setHours(0, 0, 0, 0);
      e = new Date();
      e.setHours(23, 59, 59, 999);
      e = new Date(e.getTime() + 1); // exclusive
    }
    const si = toISODate(s);
    const ei = toISODate(e);
    setStart(si);
    setEnd(ei);
    fetchRange(si, ei);
  }

  const profit = data?.summary.grossProfit ?? 0;
  const cost = data?.summary.totalCost ?? 0;
  const total = Math.max(0, profit) + Math.max(0, cost);
  const profitPct = total > 0 ? (Math.max(profit, 0) / total) * 100 : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn" onClick={() => setPreset('yesterday')}>Yesterday</button>
        <button className="btn" onClick={() => setPreset(7)}>Last 7 Days</button>
        <button className="btn" onClick={() => setPreset('month')}>This Month</button>
        <button className="btn" onClick={() => setPreset('lastMonth')}>Last Month</button>
        <button className="btn" onClick={() => setPreset('year')}>This Year</button>
        <div className="ml-4 flex items-center gap-2">
          <input type="date" value={new Date(start).toISOString().slice(0,10)} onChange={(e) => { const s = new Date(e.target.value); setStart(toISODate(new Date(s.setHours(0,0,0,0)))); }} />
          <input type="date" value={new Date(end).toISOString().slice(0,10)} onChange={(e) => { const d = new Date(e.target.value); const ex = new Date(d); ex.setDate(ex.getDate() + 1); setEnd(toISODate(ex)); }} />
          <button className="btn" onClick={() => fetchRange(start, end)}>Apply</button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-slate-500">Total Sales</div>
          <div className="mt-2 text-xl font-semibold">{formatCurrency(data?.summary.totalSales ?? 0)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-slate-500">Total Cost</div>
          <div className="mt-2 text-xl font-semibold">{formatCurrency(data?.summary.totalCost ?? 0)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-slate-500">Gross Profit</div>
          <div className="mt-2 text-xl font-semibold">{formatCurrency(data?.summary.grossProfit ?? 0)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-slate-500">Profit Margin</div>
          <div className="mt-2 text-xl font-semibold">{(data?.summary.profitMargin ?? 0).toFixed(1)}%</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <div className="rounded-xl border bg-white p-6 flex items-center gap-6">
          <div className="relative h-40 w-40 rounded-full border" style={{ background: `conic-gradient(#10B981 0% ${profitPct}%, #0ea5e9 ${profitPct}% 100%)` }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-sm text-slate-500">Profit</div>
              <div className="mt-2 text-lg font-bold">{formatCurrency(profit)}</div>
              <div className="text-xs text-slate-400 mt-1">{profitPct.toFixed(1)}%</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Cost</div>
            <div className="mt-2 text-lg font-semibold">{formatCurrency(cost)}</div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <div className="text-sm text-slate-500">Top Profitable Products</div>
          <div className="mt-3 space-y-3">
            {data?.topProducts.map((p) => (
              <div key={p.productId} className="flex items-center gap-3">
                <div className="min-w-[160px]">
                  <div className="font-medium">{p.productName}</div>
                  <div className="text-xs text-slate-500">{p.quantitySold} units</div>
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-slate-100 rounded overflow-hidden">
                    <div style={{ width: `${Math.max(0, (p.grossProfit / Math.max(1, data.summary.grossProfit)) * 100)}%` }} className="h-full bg-emerald-500" />
                  </div>
                </div>
                <div className="w-24 text-right font-semibold">{formatCurrency(p.grossProfit)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-slate-500">
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Buy Rate</th>
                <th className="px-3 py-2">Sale Price</th>
                <th className="px-3 py-2">Total Sales</th>
                <th className="px-3 py-2">Total Cost</th>
                <th className="px-3 py-2">Gross Profit</th>
                <th className="px-3 py-2">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {data?.topProducts.map((p) => (
                <tr key={p.productId} className="border-t">
                  <td className="px-3 py-2">{p.productName}</td>
                  <td className="px-3 py-2">{p.quantitySold}</td>
                  <td className="px-3 py-2">{formatCurrency(p.totalCost / Math.max(1, p.quantitySold))}</td>
                  <td className="px-3 py-2">{formatCurrency(p.totalSales / Math.max(1, p.quantitySold))}</td>
                  <td className="px-3 py-2">{formatCurrency(p.totalSales)}</td>
                  <td className="px-3 py-2">{formatCurrency(p.totalCost)}</td>
                  <td className="px-3 py-2">{formatCurrency(p.grossProfit)}</td>
                  <td className="px-3 py-2">{p.profitMargin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
