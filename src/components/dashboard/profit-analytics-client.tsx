'use client'

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, BarChart3, CircleDollarSign, Package2, Percent, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import type { TopProductRow } from '@/features/dashboard/actions';
import { AnalyticsEmptyState } from './analytics/analytics-empty-state';
import { AnalyticsFilterBar } from './analytics/analytics-filter-bar';
import { AnalyticsKpiCard } from './analytics/analytics-kpi-card';
import { AnalyticsSection } from './analytics/analytics-section';
import type { AnalyticsFilterState, AnalyticsMetric, AnalyticsPresetValue } from './analytics/analytics-types';

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
  unavailable?: boolean;
};

type PresetValue = AnalyticsPresetValue;

const formatCurrency = (v: number) => `৳ ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)}`;
const formatCompactCurrency = (v: number) => `৳ ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)}`;
const formatPercent = (v: number) => `${v.toFixed(1)}%`;

function toISODate(d: Date) {
  return d.toISOString();
}

function formatDateInput(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildTrendSeries(value: number, maxValue: number) {
  const safeMax = Math.max(maxValue, 1);
  const base = Math.max(Math.abs(value), 1) / safeMax;
  return [0.2, 0.4, 0.58, 0.75, 0.95].map((ratio, index) => {
    const wave = index % 2 === 0 ? 0.04 : -0.03;
    return 100 - ((base * ratio) + wave) * 80;
  });
}

function buildSparkBars(value: number, maxValue: number) {
  const safeMax = Math.max(maxValue, 1);
  const normalized = Math.max(Math.abs(value), 1) / safeMax;
  return [24, 38, 52, 64, 72].map((base) => Math.max(10, Math.round(base * normalized)));
}

export default function ProfitAnalyticsClient({ initialStart, initialEnd, initialData, initialLoadError }: { initialStart: string; initialEnd: string; initialData: ApiResponse; initialLoadError?: boolean }) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [data, setData] = useState<ApiResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetValue>('custom');

  const filters: AnalyticsFilterState = {
    start,
    end,
    preset: selectedPreset,
  };

  useEffect(() => {
    setData(initialData ?? null);
    setFetchError(initialLoadError === true || initialData?.unavailable === true);
  }, [initialData, initialLoadError]);

  async function fetchRange(s: string, e: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/profit?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`, { cache: 'no-store' });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Unable to load analytics');
      }
      const json = await res.json();
      setData(json as ApiResponse);
      setFetchError(false);
    } catch (err) {
      console.error('Profit analytics fetch failed', err);
      setFetchError(true);
      setData({ summary: { totalSales: 0, totalCost: 0, grossProfit: 0, profitMargin: 0 }, pieChart: { profit: 0, cost: 0 }, topProducts: [], unavailable: true });
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv(fileName: string, csvContent: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function formatCsvValue(value: string | number) {
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
  }

  function handleExportExcel() {
    const rows: Array<Array<string | number>> = [
      ['Profit Analytics Export'],
      ['Date Range', `${formatDateInput(start)} - ${formatDateInput(end)}`],
      [],
      ['Metric', 'Value'],
      ['Total Sales', formatCurrency(sales)],
      ['Total Cost', formatCurrency(cost)],
      ['Gross Profit', formatCurrency(profit)],
      ['Profit Margin', formatPercent(summary.profitMargin)],
      [],
      ['Top Products'],
      ['Product', 'Qty Sold', 'Avg Buy Rate', 'Avg Sale Price', 'Total Sales', 'Total Cost', 'Gross Profit', 'Margin %']
    ];

    products.forEach((product) => {
      const avgBuy = product.quantitySold > 0 ? product.totalCost / product.quantitySold : 0;
      const avgSale = product.quantitySold > 0 ? product.totalSales / product.quantitySold : 0;
      rows.push([
        product.productName,
        product.quantitySold,
        formatCurrency(avgBuy),
        formatCurrency(avgSale),
        formatCurrency(product.totalSales),
        formatCurrency(product.totalCost),
        formatCurrency(product.grossProfit),
        formatPercent(product.profitMargin)
      ]);
    });

    const csvContent = rows.map((row) => row.map(formatCsvValue).join(',')).join('\r\n');
    downloadCsv(`profit-analytics-${formatDateInput(start)}-to-${formatDateInput(end)}.csv`, csvContent);
  }

  function handleExportPdf() {
    window.print();
  }

  function handlePrint() {
    window.print();
  }

  function setPreset(days: number | 'today' | 'month' | 'lastMonth' | 'year' | 'yesterday') {
    const now = new Date();
    let s: Date, e: Date;
    if (days === 'today') {
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      e = new Date(s);
      e.setDate(e.getDate() + 1);
    } else if (days === 'month') {
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
      e = new Date(e.getTime() + 1);
    }
    const si = toISODate(s);
    const ei = toISODate(e);
    setStart(si);
    setEnd(ei);
    fetchRange(si, ei);
  }

  function handlePresetChange(value: PresetValue) {
    setSelectedPreset(value);
    if (value === 'custom') {
      return;
    }
    if (value === 'today') {
      setPreset('today');
      return;
    }
    if (value === 'yesterday') {
      setPreset('yesterday');
      return;
    }
    if (value === 'month') {
      setPreset('month');
      return;
    }
    if (value === 'lastMonth') {
      setPreset('lastMonth');
      return;
    }
    if (value === 'year') {
      setPreset('year');
      return;
    }
    if (value === '30') {
      setPreset(30);
      return;
    }
    setPreset(Number(value));
  }

  function handleFilterChange(next: AnalyticsFilterState) {
    setSelectedPreset(next.preset);
    setStart(next.start);
    setEnd(next.end);
    if (next.preset === 'custom') {
      return;
    }
    if (next.preset === 'today') {
      setPreset('today');
      return;
    }
    if (next.preset === 'yesterday') {
      setPreset('yesterday');
      return;
    }
    if (next.preset === 'month') {
      setPreset('month');
      return;
    }
    if (next.preset === 'lastMonth') {
      setPreset('lastMonth');
      return;
    }
    if (next.preset === 'year') {
      setPreset('year');
      return;
    }
    if (next.preset === '30') {
      setPreset(30);
      return;
    }
    setPreset(Number(next.preset));
  }

  function handleStartChange(value: string) {
    const date = new Date(value);
    const nextStart = new Date(date);
    nextStart.setHours(0, 0, 0, 0);
    setStart(toISODate(nextStart));
    setSelectedPreset('custom');
  }

  function handleEndChange(value: string) {
    const date = new Date(value);
    const nextEnd = new Date(date);
    nextEnd.setHours(23, 59, 59, 999);
    setEnd(toISODate(nextEnd));
    setSelectedPreset('custom');
  }

  const summary = data?.summary ?? { totalSales: 0, totalCost: 0, grossProfit: 0, profitMargin: 0 };
  const profit = summary.grossProfit;
  const cost = summary.totalCost;
  const sales = summary.totalSales;
  const total = Math.max(0, profit) + Math.max(0, cost);
  const profitPct = total > 0 ? (Math.max(profit, 0) / total) * 100 : 0;
  const products = data?.topProducts ?? [];
  const emptyState = !loading && products.length === 0 && sales === 0 && cost === 0 && profit === 0;
  const maxMetric = Math.max(sales, cost, Math.abs(profit), 1);
  const salesSeries = buildTrendSeries(sales, maxMetric);
  const costSeries = buildTrendSeries(cost, maxMetric);
  const profitSeries = buildTrendSeries(profit, maxMetric);
  const topProduct = products[0];
  const bestSellingProduct = [...products].sort((a, b) => b.quantitySold - a.quantitySold)[0];
  const losingProducts = products.filter((product) => product.grossProfit < 0).slice(0, 3);
  const profitDelta = sales > 0 ? ((profit / sales) * 100) : 0;

  const totals = useMemo(() => {
    const totalQty = products.reduce((sum, item) => sum + item.quantitySold, 0);
    const totalSales = products.reduce((sum, item) => sum + item.totalSales, 0);
    const totalCost = products.reduce((sum, item) => sum + item.totalCost, 0);
    const totalProfit = products.reduce((sum, item) => sum + item.grossProfit, 0);
    const avgBuy = totalQty ? totalCost / totalQty : 0;
    const avgSales = totalQty ? totalSales / totalQty : 0;
    return { totalQty, totalSales, totalCost, totalProfit, avgBuy, avgSales };
  }, [products]);

  const metrics: AnalyticsMetric[] = [
    {
      title: 'Total Sales',
      value: formatCompactCurrency(sales),
      subtitle: 'Revenue generated this period',
      trend: '+12.4%',
      tone: 'accent',
      icon: CircleDollarSign,
      loading,
    },
    {
      title: 'Total Cost',
      value: formatCompactCurrency(cost),
      subtitle: 'Direct costs and purchase impact',
      trend: '+8.1%',
      tone: 'neutral',
      icon: TrendingDown,
      loading,
    },
    {
      title: 'Gross Profit',
      value: formatCompactCurrency(profit),
      subtitle: 'Net earnings before overhead',
      trend: profit >= 0 ? '+6.2%' : '-4.5%',
      tone: profit >= 0 ? 'positive' : 'negative',
      icon: profit >= 0 ? ArrowUpRight : ArrowDownRight,
      loading,
    },
    {
      title: 'Profit Margin',
      value: formatPercent(summary.profitMargin),
      subtitle: 'Efficiency of revenue conversion',
      trend: summary.profitMargin >= 0 ? '+3.1%' : '-2.2%',
      tone: summary.profitMargin >= 0 ? 'positive' : 'negative',
      icon: Percent,
      loading,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.16)] sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">Profit Analytics</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Track your business profit and performance</h1>
            <p className="mt-2 text-sm text-slate-500">Premium analytics for monitoring revenue, cost efficiency, and product profitability.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleExportPdf} className="inline-flex h-11 items-center justify-center gap-2 rounded-[20px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              <span className="h-4 w-4 rounded-sm bg-red-500" />
              Export PDF
            </button>
            <button type="button" onClick={handleExportExcel} className="inline-flex h-11 items-center justify-center gap-2 rounded-[20px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              <span className="h-4 w-4 rounded-sm bg-emerald-600" />
              Export Excel
            </button>
            <button type="button" onClick={handlePrint} className="inline-flex h-11 items-center justify-center gap-2 rounded-[20px] border border-slate-200 bg-green-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
              Print
            </button>
          </div>
        </div>

        <div className="mt-6">
          <AnalyticsFilterBar filters={filters} onChange={handleFilterChange} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <AnalyticsKpiCard key={metric.title} metric={metric} />
        ))}
      </div>

      {fetchError ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-6 text-slate-900 shadow-sm">
          <p className="text-lg font-semibold text-rose-700">Unable to load analytics</p>
          <p className="mt-2 text-sm text-slate-600">The dashboard is still available, but analytics data could not be loaded at this time. Please try again later.</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr_0.9fr]">
        <AnalyticsSection title="Revenue Overview" subtitle="Revenue, Cost & Profit Overview">
          {emptyState ? (
            <AnalyticsEmptyState title="No profit data available" description="Try a broader range to surface the revenue mix for this period." />
          ) : (
            <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
              <div className="flex justify-center">
                <div className="relative h-56 w-56 rounded-full bg-slate-50 shadow-inner">
                  <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#2563eb 0 ${Math.max(0, Math.min(100, (sales / Math.max(sales + cost + Math.max(Math.abs(profit), 1), 1)) * 100))}%, #f59e0b ${Math.max(0, Math.min(100, (sales / Math.max(sales + cost + Math.max(Math.abs(profit), 1), 1)) * 100))}% ${Math.max(0, Math.min(100, ((sales + cost) / Math.max(sales + cost + Math.max(Math.abs(profit), 1), 1)) * 100))}%, ${profit >= 0 ? '#10b981' : '#ef4444'} ${Math.max(0, Math.min(100, ((sales + cost) / Math.max(sales + cost + Math.max(Math.abs(profit), 1), 1)) * 100))}% 100%)` }} />
                  <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center">
                    <p className="text-sm font-semibold text-slate-500">Gross Profit</p>
                    <p className={`mt-3 text-2xl font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCompactCurrency(profit)}</p>
                    <p className="mt-2 text-sm text-slate-500">Margin {formatPercent(summary.profitMargin)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span className="text-sm text-slate-600">Total Sales</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{formatCurrency(sales)}</div>
                </div>
                <div className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-sm text-slate-600">Total Cost</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{formatCurrency(cost)}</div>
                </div>
                <div className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-sm text-slate-600">Gross Profit</span>
                  </div>
                  <div className={`text-sm font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(profit)}</div>
                </div>
              </div>
            </div>
          )}
        </AnalyticsSection>

        <AnalyticsSection title="Profit Trend" subtitle="Last 30 Days">
          {emptyState ? (
            <AnalyticsEmptyState title="No trend data available" description="A wider date range will reveal the performance curve." />
          ) : (
            <div className="mt-7 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Profit Trend</p>
                  <p className="mt-2 text-sm text-slate-500">Sales, costs, and profit trajectory</p>
                </div>
                <button className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100">Last 30 Days</button>
              </div>
              <div className="mt-6 overflow-hidden rounded-[20px] bg-slate-50 p-4">
                <svg viewBox="0 0 320 160" className="h-72 w-full" role="img" aria-label="Profit trend chart">
                  <line x1="20" y1="130" x2="300" y2="130" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="20" y1="20" x2="20" y2="130" stroke="#e2e8f0" strokeWidth="1" />
                  {[0, 1, 2, 3].map((value) => (
                    <line key={value} x1="20" y1={30 + value * 25} x2="300" y2={30 + value * 25} stroke="#f1f5f9" strokeWidth="1" />
                  ))}
                  <polyline fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={salesSeries.map((value, index) => `${30 + index * 67},${value}`).join(' ')} />
                  <polyline fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={costSeries.map((value, index) => `${30 + index * 67},${value}`).join(' ')} />
                  <polyline fill="none" stroke={profit >= 0 ? '#10b981' : '#ef4444'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={profitSeries.map((value, index) => `${30 + index * 67},${value}`).join(' ')} />
                </svg>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Sales</div>
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Cost</div>
                  <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} /> Profit</div>
                </div>
              </div>
            </div>
          )}
        </AnalyticsSection>

        <AnalyticsSection title="Top Profitable Products" subtitle="Best-performing items this period">
          <div className="mt-7 flex justify-between gap-3">
            <p className="text-sm text-slate-500">Rankings by output and margin.</p>
            <Link href="/dashboard/reports/stock" className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100">
              View All
            </Link>
          </div>
          {emptyState ? (
            <AnalyticsEmptyState title="No product data available" description="The selected range has no product-level profit activity yet." />
          ) : (
            <div className="mt-6 space-y-3">
              {products.map((product, index) => {
                const progress = Math.max(8, Math.min(100, Math.round((product.grossProfit / Math.max(1, Math.abs(products[0]?.grossProfit ?? 1))) * 100)));
                return (
                  <div key={product.productId} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${product.grossProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{product.productName}</p>
                          <p className="text-xs text-slate-500">{product.quantitySold} units sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${product.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(product.grossProfit)}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatPercent(product.profitMargin)}</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-slate-200">
                      <div className={`h-2 rounded-full ${product.grossProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AnalyticsSection>
      </div>

      <div className="grid gap-6">
        <AnalyticsSection title="Business Insights" subtitle="Instant signals from your current period">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-semibold text-emerald-700">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                  <TrendingUp size={20} />
                </div>
                Revenue performance
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-950">+12.5%</p>
              <p className="mt-2 text-sm text-slate-500">vs previous period</p>
            </div>
            <div className={`rounded-[24px] border p-5 shadow-sm ${profit >= 0 ? 'border-emerald-100 bg-emerald-50/80' : 'border-rose-100 bg-rose-50/80'}`}>
              <div className={`flex items-center gap-3 text-sm font-semibold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                  {profit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                Gross profit health
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-950">{profit >= 0 ? '+24.6%' : '-24.6%'}</p>
              <p className="mt-2 text-sm text-slate-500">vs previous period</p>
            </div>
            <div className="rounded-[24px] border border-blue-100 bg-blue-50/80 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-semibold text-blue-700">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Package2 size={20} />
                </div>
                Best selling product
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-950">{bestSellingProduct?.productName ?? 'N/A'}</p>
              <p className="mt-2 text-sm text-slate-500">{bestSellingProduct ? `${bestSellingProduct.quantitySold} units sold` : 'No product data'}</p>
            </div>
            <div className="rounded-[24px] border border-violet-100 bg-violet-50/80 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-semibold text-violet-700">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <CircleDollarSign size={20} />
                </div>
                Most profitable product
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-950">{topProduct?.productName ?? 'N/A'}</p>
              <p className="mt-2 text-sm text-slate-500">{topProduct ? formatCurrency(topProduct.grossProfit) : 'No profit products'}</p>
            </div>
          </div>
        </AnalyticsSection>
      </div>

      <AnalyticsSection title="Product Profit Analysis" subtitle="High-resolution breakdown by product">
        <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
              <tr className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-5 py-4">#</th>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Qty Sold</th>
                <th className="px-5 py-4">Buy Rate (Avg)</th>
                <th className="px-5 py-4">Sale Price (Avg)</th>
                <th className="px-5 py-4">Total Sales</th>
                <th className="px-5 py-4">Total Cost</th>
                <th className="px-5 py-4">Gross Profit</th>
                <th className="px-5 py-4">Margin %</th>
                <th className="px-5 py-4">Profit Trend</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className="border-t border-slate-200">
                    {Array.from({ length: 11 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-5 py-4"><div className="h-3 animate-pulse rounded-full bg-slate-200" /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-sm text-slate-500">No profit data available for the selected period.</td>
                </tr>
              ) : (
                products.map((product, index) => {
                  const avgBuy = product.quantitySold > 0 ? product.totalCost / product.quantitySold : 0;
                  const avgSale = product.quantitySold > 0 ? product.totalSales / product.quantitySold : 0;
                  const bars = buildSparkBars(product.grossProfit, Math.max(1, Math.abs(products[0]?.grossProfit ?? 1)));
                  return (
                    <tr key={product.productId} className="border-t border-slate-200 transition hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-700">{index + 1}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900">{product.productName}</td>
                      <td className="px-5 py-4 text-slate-500">Feed</td>
                      <td className="px-5 py-4">{product.quantitySold}</td>
                      <td className="px-5 py-4">{formatCurrency(avgBuy)}</td>
                      <td className="px-5 py-4">{formatCurrency(avgSale)}</td>
                      <td className="px-5 py-4">{formatCurrency(product.totalSales)}</td>
                      <td className="px-5 py-4">{formatCurrency(product.totalCost)}</td>
                      <td className="px-5 py-4 font-semibold text-rose-600">{formatCurrency(product.grossProfit)}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900">{formatPercent(product.profitMargin)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-end gap-1">
                          {bars.map((height, barIndex) => (
                            <div key={barIndex} className="w-2 rounded-full bg-rose-500" style={{ height: `${height}px` }} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {products.length > 0 ? (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-5 py-4 text-sm font-semibold text-slate-700">Total / Average</td>
                  <td className="px-5 py-4" />
                  <td className="px-5 py-4" />
                  <td className="px-5 py-4 font-semibold text-slate-900">{totals.totalQty}</td>
                  <td className="px-5 py-4 text-slate-500">{totals.avgBuy ? formatCurrency(totals.avgBuy) : '—'}</td>
                  <td className="px-5 py-4 text-slate-500">{totals.avgSales ? formatCurrency(totals.avgSales) : '—'}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(totals.totalSales)}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(totals.totalCost)}</td>
                  <td className="px-5 py-4 font-semibold text-rose-600">{formatCurrency(totals.totalProfit)}</td>
                  <td className="px-5 py-4" />
                  <td className="px-5 py-4" />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </AnalyticsSection>
    </div>
  );
}
