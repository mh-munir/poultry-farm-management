import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { AnalyticsMetric } from "./analytics-types";

type Props = {
  metric: AnalyticsMetric;
};

export function AnalyticsKpiCard({ metric }: Props) {
  const Icon = metric.icon;
  const isMargin = metric.title.toLowerCase().includes("margin");

  return (
    <div className="group h-full rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.title}</p>
          <div className="mt-4 flex items-center gap-3">
            {Icon ? (
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm">
                <Icon size={18} />
              </span>
            ) : null}
            <div>
              {metric.loading ? (
                <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200" />
              ) : (
                <p className={`text-3xl font-semibold tracking-tight ${isMargin ? "text-slate-900" : "text-slate-950"}`}>{metric.value}</p>
              )}
              <p className="mt-2 text-sm text-slate-500">{metric.subtitle}</p>
            </div>
          </div>
        </div>
        {isMargin ? (
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
            <span className={`absolute inset-1 rounded-full ${metric.trend?.startsWith("-") ? "bg-rose-100" : "bg-emerald-100"}`} />
            <div className="relative flex h-full w-full items-center justify-center rounded-full">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-900" />
            </div>
          </div>
        ) : (
          <div className="mt-4 h-16 w-28 rounded-[20px] bg-slate-50 p-2">
            <div className="flex h-full items-end gap-1">
              <span className="block h-2 w-1/4 rounded-full bg-slate-300" />
              <span className="block h-3.5 w-1/4 rounded-full bg-slate-400" />
              <span className="block h-5 w-1/4 rounded-full bg-slate-500" />
              <span className="block h-3 w-1/4 rounded-full bg-slate-400" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm font-medium">
        <span className={`inline-flex items-center gap-2 ${metric.trend?.startsWith("-") ? "text-rose-600" : "text-emerald-600"}`}>
          {metric.trend?.startsWith("-") ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
          {metric.trend}
        </span>
        <span className="text-slate-500">{metric.subtitle}</span>
      </div>
    </div>
  );
}
