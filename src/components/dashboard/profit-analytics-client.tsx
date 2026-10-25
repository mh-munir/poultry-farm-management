'use client'

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Building2, CircleDollarSign, Package2, Percent, TrendingDown, TrendingUp, UsersRound, Wheat } from 'lucide-react';
import type { DashboardBalanceSummary, ProfitTrendPoint, TopProductRow } from '@/features/dashboard/actions';
import { getProductTypeLabel } from '@/lib/product-types';
import { AnalyticsEmptyState } from './analytics/analytics-empty-state';
import { AnalyticsFilterBar } from './analytics/analytics-filter-bar';
import { AnalyticsKpiCard } from './analytics/analytics-kpi-card';
import { AnalyticsSection } from './analytics/analytics-section';
import type { AnalyticsFilterState, AnalyticsMetric, AnalyticsPresetValue } from './analytics/analytics-types';
import { useLocalizedFormat } from '@/i18n/use-localized-format';
import { useLocale } from '@/i18n/provider';
import { formatDateBD, toDateInputValueBD } from '@/lib/dates';

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
  trendSeries: ProfitTrendPoint[];
  unavailable?: boolean;
};

type PresetValue = AnalyticsPresetValue;

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

function getInitialPreset(start: string, end: string): PresetValue {
  if (!start || !end) {
    return 'none';
  }

  const now = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  if (startDate.getTime() === todayStart.getTime() && endDate.getTime() === tomorrowStart.getTime()) {
    return 'today';
  }

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  if (startDate.getTime() === yesterdayStart.getTime() && endDate.getTime() === todayStart.getTime()) {
    return 'yesterday';
  }

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  if (startDate.getTime() === sevenDaysAgo.getTime() && endDate.getTime() === tomorrowStart.getTime()) {
    return '7';
  }

  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  if (startDate.getTime() === thirtyDaysAgo.getTime() && endDate.getTime() === tomorrowStart.getTime()) {
    return '30';
  }

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (startDate.getTime() === thisMonthStart.getTime() && endDate.getTime() === nextMonthStart.getTime()) {
    return 'month';
  }

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (startDate.getTime() === lastMonthStart.getTime() && endDate.getTime() === thisMonthStart.getTime()) {
    return 'lastMonth';
  }

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);
  if (startDate.getTime() === yearStart.getTime() && endDate.getTime() === nextYearStart.getTime()) {
    return 'year';
  }

  return 'custom';
}

export default function ProfitAnalyticsClient({
  initialStart = '',
  initialEnd = '',
  initialData,
  initialLoadError,
  initialBalances,
  balanceLoadError = false,
}: {
  initialStart?: string;
  initialEnd?: string;
  initialData: ApiResponse;
  initialLoadError?: boolean;
  initialBalances: DashboardBalanceSummary;
  balanceLoadError?: boolean;
}) {
  const { dict } = useLocale();
  const { formatCurrency, formatNumber, formatPercentage, toBanglaDigits, locale } = useLocalizedFormat();
  
  // Wrapper for formatting without decimals (compact)
  const formatCompactCurrency = (v: number) => formatCurrency(Math.round(v));
  const formatPercent = (v: number) => formatPercentage(v);
  
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [data, setData] = useState<ApiResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetValue>(getInitialPreset(initialStart, initialEnd));

  const filters: AnalyticsFilterState = {
    start: start ? toDateInputValueBD(start) : '',
    end: end ? toDateInputValueBD(new Date(new Date(end).getTime() - 1)) : '',
    preset: selectedPreset,
  };
  const formatTrendDate = (value: string) => {
    const formatted = formatDateBD(value);
    return locale === 'bn' ? toBanglaDigits(formatted) : formatted;
  };
  const selectedRangeLabel = filters.preset === 'none'
    ? dict.common.allTime
    : filters.preset === 'custom'
      ? `${filters.start ? formatTrendDate(filters.start) : '—'} – ${filters.end ? formatTrendDate(filters.end) : '—'}`
      : filters.preset === 'today'
        ? dict.common.today
        : filters.preset === 'yesterday'
          ? dict.common.yesterday
          : filters.preset === '7'
            ? dict.analytics.last7Days
            : filters.preset === '30'
              ? dict.analytics.last30Days
              : filters.preset === 'month'
                ? dict.analytics.thisMonth
                : filters.preset === 'lastMonth'
                  ? dict.analytics.lastMonth
                  : dict.analytics.dateRange;

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
      setData({ summary: { totalSales: 0, totalCost: 0, grossProfit: 0, profitMargin: 0 }, pieChart: { profit: 0, cost: 0 }, topProducts: [], trendSeries: [], unavailable: true });
    } finally {
      setLoading(false);
    }
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/profit', { cache: 'no-store' });
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
      setData({ summary: { totalSales: 0, totalCost: 0, grossProfit: 0, profitMargin: 0 }, pieChart: { profit: 0, cost: 0 }, topProducts: [], trendSeries: [], unavailable: true });
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
    const formatExportDate = (value: string) => {
      const formatted = formatDateInput(value);
      return locale === 'bn' ? toBanglaDigits(formatted) : formatted;
    };
    const rows: Array<Array<string | number>> = [
      [dict.analytics.exportTitle],
      [dict.analytics.dateRange, `${formatExportDate(start)} - ${formatExportDate(end)}`],
      [],
      [dict.analytics.metric, dict.analytics.value],
      [dict.analytics.totalSales, formatCurrency(sales)],
      [dict.analytics.totalCost, formatCurrency(cost)],
      [dict.analytics.grossProfit, formatCurrency(profit)],
      [dict.analytics.margin, formatPercent(summary.profitMargin)],
      [],
      [dict.analytics.bestProducts],
      [dict.analytics.product, dict.analytics.qtySold, dict.analytics.avgBuyRate, dict.analytics.avgSalePrice, dict.analytics.totalSalesTable, dict.analytics.totalCostTable, dict.analytics.grossProfit, dict.analytics.marginPercent]
    ];

    products.forEach((product) => {
      const avgBuy = product.quantitySold > 0 ? product.totalCost / product.quantitySold : 0;
      const avgSale = product.quantitySold > 0 ? product.totalSales / product.quantitySold : 0;
      rows.push([
        product.productName,
        formatNumber(product.quantitySold),
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

  function handleFilterChange(next: AnalyticsFilterState) {
    setSelectedPreset(next.preset);
    setStart(next.start);
    setEnd(next.end);

    if (next.preset === 'none') {
      setStart('');
      setEnd('');
      fetchAll();
      return;
    }

    if (next.preset === 'custom') {
      if (!next.start || !next.end) {
        return;
      }

      const customStart = new Date(next.start);
      customStart.setHours(0, 0, 0, 0);
      const customEnd = new Date(next.end);
      customEnd.setHours(23, 59, 59, 999);
      const startIso = toISODate(customStart);
      const endIso = toISODate(new Date(customEnd.getTime() + 1));
      setStart(startIso);
      setEnd(endIso);
      fetchRange(startIso, endIso);
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

  const summary = data?.summary ?? { totalSales: 0, totalCost: 0, grossProfit: 0, profitMargin: 0 };
  const profit = summary.grossProfit;
  const cost = summary.totalCost;
  const sales = summary.totalSales;
  const products = data?.topProducts ?? [];
  const trendSeries = data?.trendSeries ?? [];
  const emptyState = !loading && products.length === 0 && sales === 0 && cost === 0 && profit === 0;
  const trendValues = trendSeries.flatMap((point) => [point.totalSales, point.totalCost, point.grossProfit]);
  const trendMin = Math.min(0, ...trendValues);
  const trendMax = Math.max(1, ...trendValues);
  const trendRange = trendMax - trendMin || 1;
  const getTrendY = (value: number) => 130 - ((value - trendMin) / trendRange) * 110;
  const getTrendPoints = (value: (point: ProfitTrendPoint) => number) =>
    trendSeries.map((point, index) => {
      const x = trendSeries.length <= 1 ? 160 : 30 + (index / (trendSeries.length - 1)) * 270;
      const y = getTrendY(value(point));
      return `${x},${y}`;
    }).join(' ');
  const topProduct = products[0];
  const bestSellingProduct = [...products].sort((a, b) => b.quantitySold - a.quantitySold)[0];
  const profitColor = profit >= 0 ? '#10b981' : '#ef4444';
  const revenueBreakdownTotal = Math.max(cost + Math.abs(profit), 1);
  const costPct = Math.max(0, Math.min(100, (cost / revenueBreakdownTotal) * 100));
  const profitGradient = `conic-gradient(#f59e0b 0 ${costPct}%, ${profitColor} ${costPct}% 100%)`;

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
      title: dict.analytics.totalSales,
      value: formatCompactCurrency(sales),
      valueClassName: 'text-base sm:text-xl text-blue-600',
      titleClassName: 'text-[0.7rem] tracking-[0.1em] sm:text-[0.8125rem] sm:tracking-[0.14em]',
      cardClassName: 'bg-gradient-to-br from-blue-50/80 via-card to-card dark:from-blue-950/20',
      hideDecoration: true,
      subtitle: dict.analytics.totalSales,
      trend: '—',
      tone: 'accent',
      icon: CircleDollarSign,
      loading,
    },
    {
      title: dict.analytics.totalCost,
      value: formatCompactCurrency(cost),
      valueClassName: 'text-base sm:text-xl text-amber-600',
      titleClassName: 'text-[0.7rem] tracking-[0.1em] sm:text-[0.8125rem] sm:tracking-[0.14em]',
      cardClassName: 'bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/20',
      hideDecoration: true,
      subtitle: dict.analytics.totalCost,
      trend: '—',
      tone: 'neutral',
      icon: TrendingDown,
      loading,
    },
    {
      title: dict.analytics.grossProfit,
      value: formatCompactCurrency(profit),
      valueClassName: `text-base sm:text-xl ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`,
      titleClassName: 'text-[0.7rem] tracking-[0.1em] sm:text-[0.8125rem] sm:tracking-[0.14em]',
      cardClassName: `bg-gradient-to-br ${profit >= 0 ? 'from-emerald-50/80 dark:from-emerald-950/20' : 'from-rose-50/80 dark:from-rose-950/20'} via-card to-card`,
      hideDecoration: true,
      subtitle: dict.analytics.grossProfit,
      trend: '—',
      tone: profit >= 0 ? 'positive' : 'negative',
      icon: profit >= 0 ? ArrowUpRight : ArrowDownRight,
      loading,
    },
    {
      title: dict.analytics.margin,
      value: formatPercent(summary.profitMargin),
      valueClassName: `text-base sm:text-xl ${summary.profitMargin >= 0 ? 'text-violet-600' : 'text-rose-600'}`,
      titleClassName: 'text-[0.7rem] tracking-[0.1em] sm:text-[0.8125rem] sm:tracking-[0.14em]',
      cardClassName: `bg-gradient-to-br ${summary.profitMargin >= 0 ? 'from-violet-50/80 dark:from-violet-950/20' : 'from-rose-50/80 dark:from-rose-950/20'} via-card to-card`,
      hideDecoration: true,
      subtitle: dict.analytics.margin,
      trend: '—',
      tone: summary.profitMargin >= 0 ? 'positive' : 'negative',
      icon: Percent,
      loading,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-border bg-card/95 p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{dict.analytics.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{dict.analytics.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleExportPdf} className="inline-flex h-11 items-center justify-center gap-2 rounded-[20px] border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/20">
              <span className="h-4 w-4 rounded-sm bg-red-500" />
              {dict.analytics.exportPdf}
            </button>
            <button type="button" onClick={handleExportExcel} className="inline-flex h-11 items-center justify-center gap-2 rounded-[20px] border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/20">
              <span className="h-4 w-4 rounded-sm bg-emerald-600" />
              {dict.analytics.exportExcel}
            </button>
            <button type="button" onClick={handlePrint} className="inline-flex h-11 items-center justify-center gap-2 rounded-[20px] border border-border bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
              {dict.common.print}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <AnalyticsFilterBar filters={filters} onChange={handleFilterChange} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <AnalyticsKpiCard key={metric.title} metric={metric} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AnalyticsKpiCard
          metric={{
            title: dict.analytics.companiesPayable,
            value: balanceLoadError ? '—' : formatCurrency(initialBalances.companiesPayable),
            valueClassName: 'text-base sm:text-xl text-rose-600',
            titleClassName: 'text-[0.7rem] tracking-[0.1em] sm:text-[0.8125rem] sm:tracking-[0.14em]',
            cardClassName: 'bg-gradient-to-br from-rose-50/80 via-card to-card dark:from-rose-950/20',
            hideDecoration: true,
            subtitle: balanceLoadError ? dict.analytics.balanceUnavailable : dict.analytics.allTimeBalance,
            tone: 'negative',
            icon: Building2,
          }}
        />
        <AnalyticsKpiCard
          metric={{
            title: dict.analytics.partiesReceivable,
            value: balanceLoadError ? '—' : formatCurrency(initialBalances.partiesReceivable),
            valueClassName: 'text-base sm:text-xl',
            titleClassName: 'text-[0.7rem] tracking-[0.1em] sm:text-[0.8125rem] sm:tracking-[0.14em]',
            cardClassName: 'bg-gradient-to-br from-emerald-50/80 via-card to-card dark:from-emerald-950/20',
            hideDecoration: true,
            subtitle: balanceLoadError ? dict.analytics.balanceUnavailable : dict.analytics.allTimeBalance,
            tone: 'positive',
            icon: UsersRound,
          }}
        />
        <AnalyticsKpiCard
          metric={{
            title: dict.analytics.partySuppliersPayable,
            value: balanceLoadError ? '—' : formatCurrency(initialBalances.partySuppliersPayable),
            valueClassName: 'text-base sm:text-xl text-amber-600',
            titleClassName: 'text-[0.7rem] tracking-[0.1em] sm:text-[0.8125rem] sm:tracking-[0.14em]',
            cardClassName: 'bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/20',
            hideDecoration: true,
            subtitle: balanceLoadError ? dict.analytics.balanceUnavailable : dict.analytics.allTimeBalance,
            tone: 'negative',
            icon: Wheat,
          }}
        />
      </div>

      {fetchError ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-6 text-foreground shadow-sm">
          <p className="text-lg font-semibold text-rose-700">{dict.analytics.unableToLoad}</p>
          <p className="mt-2 text-sm text-muted-foreground">{dict.analytics.fallbackText}</p>
        </div>
      ) : null}

      <div className="grid items-start gap-6 2xl:grid-cols-[1.25fr_1fr_0.9fr]">
        <AnalyticsSection title={dict.analytics.revenueOverview} subtitle={dict.analytics.revenueOverviewSubtitle}>
          {emptyState ? (
            <AnalyticsEmptyState title={dict.analytics.noProfitData} description={dict.analytics.noProfitDataDescription} />
          ) : (
            <div className="mt-7 grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_220px] 2xl:items-center">
              <div className="flex justify-center">
                <div data-testid="revenue-breakdown-chart" className="relative h-44 w-44 shrink-0 rounded-full bg-muted/10 shadow-inner sm:h-56 sm:w-56">
                  <div className="absolute inset-0 rounded-full" style={{ background: profitGradient }} />
                  <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-card px-2 text-center sm:inset-8 sm:px-3">
                    <p className="text-xs font-semibold text-muted-foreground sm:text-sm">{dict.analytics.grossProfit}</p>
                    <p className={`mt-1 break-all text-base font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'} sm:mt-3 sm:text-2xl`}>{formatCompactCurrency(profit)}</p>
                    <p className="mt-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">{dict.analytics.margin} {formatPercent(summary.profitMargin)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col items-start gap-1 rounded-[20px] border border-border bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span className="text-sm text-muted-foreground">{dict.analytics.totalSales}</span>
                  </div>
                  <div className="break-all text-sm font-semibold text-foreground sm:text-right">{formatCurrency(sales)}</div>
                </div>
                <div className="flex flex-col items-start gap-1 rounded-[20px] border border-border bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-sm text-muted-foreground">{dict.analytics.totalCost}</span>
                  </div>
                  <div className="break-all text-sm font-semibold text-foreground sm:text-right">{formatCurrency(cost)}</div>
                </div>
                <div className="flex flex-col items-start gap-1 rounded-[20px] border border-border bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-sm text-muted-foreground">{dict.analytics.grossProfit}</span>
                  </div>
                  <div className={`break-all text-sm font-semibold sm:text-right ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(profit)}</div>
                </div>
              </div>
            </div>
          )}
        </AnalyticsSection>

        <AnalyticsSection title={dict.analytics.profitTrend} subtitle={selectedRangeLabel}>
          {emptyState ? (
            <AnalyticsEmptyState title={dict.analytics.noTrendData} description={dict.analytics.noTrendDataDescription} />
          ) : (
            <div className="mt-7 rounded-[24px] border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{dict.analytics.profitTrend}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{dict.analytics.salesCostProfitTrajectory}</p>
                </div>
                <span className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-muted/10 px-3 text-sm font-semibold text-foreground">
                  {selectedRangeLabel}
                </span>
              </div>
              <div className="mt-6 overflow-hidden rounded-[20px] bg-muted/10 p-4">
                <svg viewBox="0 0 320 160" className="h-72 w-full" role="img" aria-label={dict.analytics.profitTrend}>
                  <line x1="20" y1="130" x2="300" y2="130" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="20" y1="20" x2="20" y2="130" stroke="#e2e8f0" strokeWidth="1" />
                  {[0, 1, 2, 3].map((value) => (
                    <line key={value} x1="20" y1={30 + value * 25} x2="300" y2={30 + value * 25} stroke="#f1f5f9" strokeWidth="1" />
                  ))}
                  <polyline fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={getTrendPoints((point) => point.totalSales)} />
                  <polyline fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={getTrendPoints((point) => point.totalCost)} />
                  <polyline fill="none" stroke={profit >= 0 ? '#10b981' : '#ef4444'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={getTrendPoints((point) => point.grossProfit)} />
                  {trendSeries.length === 1 ? (
                    <>
                      <circle cx="160" cy={getTrendY(trendSeries[0].totalSales)} r="4" fill="#2563eb" />
                      <circle cx="160" cy={getTrendY(trendSeries[0].totalCost)} r="4" fill="#f59e0b" />
                      <circle cx="160" cy={getTrendY(trendSeries[0].grossProfit)} r="4" fill={profit >= 0 ? '#10b981' : '#ef4444'} />
                    </>
                  ) : null}
                </svg>
                {trendSeries.length > 0 ? (
                  <div className="flex justify-between px-2 text-xs text-muted-foreground">
                    <span>{formatTrendDate(trendSeries[0].bucket)}</span>
                    <span>{formatTrendDate(trendSeries[trendSeries.length - 1].bucket)}</span>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> {dict.analytics.totalSales}</div>
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> {dict.analytics.totalCost}</div>
                  <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} /> {dict.analytics.grossProfit}</div>
                </div>
              </div>
            </div>
          )}
        </AnalyticsSection>

        <AnalyticsSection title={dict.analytics.bestProducts} subtitle={dict.analytics.bestProductsSubtitle}>
          <div className="mt-7 flex justify-between gap-3">
            <p className="text-sm text-muted-foreground">{dict.analytics.rankingsByOutput}</p>
            <Link href="/dashboard/reports/stock" className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-muted/10 px-4 text-sm font-semibold text-foreground shadow-sm transition hover:border-border hover:bg-muted/20">
              {dict.analytics.viewAll}
            </Link>
          </div>
          {emptyState ? (
            <AnalyticsEmptyState title={dict.analytics.noProductData} description={dict.analytics.noProductDataDescription} />
          ) : (
            <div className="mt-6 space-y-3">
              {products.map((product, index) => {
                const progress = Math.max(8, Math.min(100, Math.round((product.grossProfit / Math.max(1, Math.abs(products[0]?.grossProfit ?? 1))) * 100)));
                return (
                  <div key={product.productId} className="rounded-[24px] border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${product.grossProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{product.productName}</p>
                          <p className="text-xs text-muted-foreground">{dict.analytics.unitsSold.replace("{count}", formatNumber(product.quantitySold))}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${product.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(product.grossProfit)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatPercent(product.profitMargin)}</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-muted/20">
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
        <AnalyticsSection title={dict.analytics.businessInsights} subtitle={dict.analytics.businessInsightsSubtitle}>
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-500/10 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-semibold text-emerald-700">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-emerald-700 shadow-sm">
                  <TrendingUp size={20} />
                </div>
                {dict.analytics.revenuePerformance}
              </div>
              <p className="mt-4 text-2xl font-semibold text-foreground">—</p>
              <p className="mt-2 text-sm text-muted-foreground">{dict.analytics.historicalComparisonUnavailable}</p>
            </div>
            <div className={`rounded-[24px] border p-5 shadow-sm ${profit >= 0 ? 'border-emerald-100 bg-emerald-500/10' : 'border-rose-100 bg-rose-500/10'}`}>
              <div className={`flex items-center gap-3 text-sm font-semibold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card shadow-sm">
                  {profit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                {dict.analytics.profitHealth}
              </div>
              <p className="mt-4 text-2xl font-semibold text-foreground">—</p>
              <p className="mt-2 text-sm text-muted-foreground">{dict.analytics.historicalComparisonUnavailable}</p>
            </div>
            <div className="rounded-[24px] border border-blue-100 bg-blue-500/10 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-semibold text-blue-700">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card shadow-sm">
                  <Package2 size={20} />
                </div>
                {dict.analytics.bestSellingProduct}
              </div>
              <p className="mt-4 text-2xl font-semibold text-foreground">{bestSellingProduct?.productName ?? dict.analytics.noProductDataShort}</p>
              <p className="mt-2 text-sm text-muted-foreground">{bestSellingProduct ? dict.analytics.unitsSold.replace("{count}", formatNumber(bestSellingProduct.quantitySold)) : dict.analytics.noProductDataShort}</p>
            </div>
            <div className="rounded-[24px] border border-violet-100 bg-violet-500/10 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-semibold text-violet-700">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card shadow-sm">
                  <CircleDollarSign size={20} />
                </div>
                {dict.analytics.mostProfitableProduct}
              </div>
              <p className="mt-4 text-2xl font-semibold text-foreground">{topProduct?.productName ?? dict.analytics.noProductDataShort}</p>
              <p className="mt-2 text-sm text-muted-foreground">{topProduct ? formatCurrency(topProduct.grossProfit) : dict.analytics.noProfitProducts}</p>
            </div>
          </div>
        </AnalyticsSection>
      </div>

      <AnalyticsSection title={dict.analytics.productProfitAnalysis} subtitle={dict.analytics.productProfitAnalysisSubtitle}>
        <div className="overflow-x-auto rounded-[24px] border border-border bg-card shadow-sm">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <tr className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-4">#</th>
                <th className="px-5 py-4">{dict.analytics.product}</th>
                <th className="px-5 py-4">{dict.analytics.category}</th>
                <th className="px-5 py-4">{dict.analytics.qtySold}</th>
                <th className="px-5 py-4">{dict.analytics.avgBuyRate}</th>
                <th className="px-5 py-4">{dict.analytics.avgSalePrice}</th>
                <th className="px-5 py-4">{dict.analytics.totalSalesTable}</th>
                <th className="px-5 py-4">{dict.analytics.totalCostTable}</th>
                <th className="px-5 py-4">{dict.analytics.grossProfit}</th>
                <th className="px-5 py-4">{dict.analytics.marginPercent}</th>
              </tr>
            </thead>
            <tbody className="text-sm text-foreground">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className="border-t border-border">
                    {Array.from({ length: 10 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-5 py-4"><div className="h-3 animate-pulse rounded-full bg-muted/30" /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm text-muted-foreground">{dict.analytics.noProfitDataTable}</td>
                </tr>
              ) : (
                products.map((product, index) => {
                  const avgBuy = product.quantitySold > 0 ? product.totalCost / product.quantitySold : 0;
                  const avgSale = product.quantitySold > 0 ? product.totalSales / product.quantitySold : 0;
                  return (
                    <tr key={product.productId} className="border-t border-border transition hover:bg-muted/20">
                      <td className="px-5 py-4 font-medium text-foreground">{index + 1}</td>
                      <td className="px-5 py-4 font-semibold text-foreground">{product.productName}</td>
                      <td className="px-5 py-4 text-muted-foreground">{getProductTypeLabel(product.productType, locale)}</td>
                      <td className="px-5 py-4">{formatNumber(product.quantitySold)}</td>
                      <td className="px-5 py-4">{formatCurrency(avgBuy)}</td>
                      <td className="px-5 py-4">{formatCurrency(avgSale)}</td>
                      <td className="px-5 py-4">{formatCurrency(product.totalSales)}</td>
                      <td className="px-5 py-4">{formatCurrency(product.totalCost)}</td>
                      <td className="px-5 py-4 font-semibold text-rose-600">{formatCurrency(product.grossProfit)}</td>
                      <td className="px-5 py-4 font-semibold text-foreground">{formatPercent(product.profitMargin)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {products.length > 0 ? (
              <tfoot>
                <tr className="border-t border-border bg-muted/10">
                  <td className="px-5 py-4 text-sm font-semibold text-foreground">{dict.analytics.totalAverage}</td>
                  <td className="px-5 py-4" />
                  <td className="px-5 py-4" />
                  <td className="px-5 py-4 font-semibold text-foreground">{formatNumber(totals.totalQty)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{totals.avgBuy ? formatCurrency(totals.avgBuy) : '—'}</td>
                  <td className="px-5 py-4 text-muted-foreground">{totals.avgSales ? formatCurrency(totals.avgSales) : '—'}</td>
                  <td className="px-5 py-4 font-semibold text-foreground">{formatCurrency(totals.totalSales)}</td>
                  <td className="px-5 py-4 font-semibold text-foreground">{formatCurrency(totals.totalCost)}</td>
                  <td className="px-5 py-4 font-semibold text-rose-600">{formatCurrency(totals.totalProfit)}</td>
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
