import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { AnalyticsMetric } from "./analytics-types";

type Props = {
  metric: AnalyticsMetric;
};

export function AnalyticsKpiCard({ metric }: Props) {
  const Icon = metric.icon;
  const isMargin = metric.title.toLowerCase().includes("margin");

  return (
    <div className={`group h-full rounded-lg border border-border bg-card p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${metric.cardClassName ?? ""}`}>
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className={`font-semibold uppercase text-muted-foreground ${metric.titleClassName ?? "text-xs tracking-[0.12em] sm:text-sm sm:tracking-[0.18em]"}`}>{metric.title}</p>
          <div className="mt-3 flex min-w-0 items-center gap-2 sm:mt-4 sm:gap-3">
            {Icon ? (
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/10 text-foreground shadow-sm sm:h-11 sm:w-11">
                <Icon size={18} />
              </span>
            ) : null}
            <div className="min-w-0">
              {metric.loading ? (
                <div className="h-10 w-28 max-w-full animate-pulse rounded-xl bg-muted/20" />
              ) : (
                <p className={`whitespace-nowrap font-semibold tracking-tight ${metric.valueClassName ?? "text-lg text-foreground sm:text-2xl"}`}>{metric.value}</p>
              )}
            </div>
          </div>
        </div>
        {metric.hideDecoration ? null : isMargin ? (
          <div className="relative hidden h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted/10 sm:flex">
            <span className={`absolute inset-1 rounded-full ${metric.trend?.startsWith("-") ? "bg-rose-500/10" : "bg-emerald-500/10"}`} />
            <div className="relative flex h-full w-full items-center justify-center rounded-full">
              <div className="h-2.5 w-2.5 rounded-full bg-foreground" />
            </div>
          </div>
        ) : (
          <div className="mt-4 hidden h-16 w-28 shrink-0 rounded-[20px] bg-muted/10 p-2 sm:block">
            <div className="flex h-full items-end gap-1">
              <span className="block h-3.5 w-1/5 rounded-full bg-amber-600/30" />
              <span className="block h-5 w-1/5 rounded-full bg-amber-600/40" />
              <span className="block h-7 w-1/5 rounded-full bg-amber-600/50" />
              <span className="block h-10 w-1/5 rounded-full bg-amber-600/60" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-medium sm:mt-5 sm:text-sm">
        {metric.trend ? (
          <span className={`inline-flex items-center gap-2 ${metric.trend.startsWith("-") ? "text-rose-600" : "text-emerald-600"}`}>
            {metric.trend.startsWith("-") ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            {metric.trend}
          </span>
        ) : null}
        <span className="min-w-0 text-muted-foreground">{metric.subtitle}</span>
      </div>
    </div>
  );
}
