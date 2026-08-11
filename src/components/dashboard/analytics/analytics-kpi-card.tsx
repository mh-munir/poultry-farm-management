import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { AnalyticsMetric } from "./analytics-types";

type Props = {
  metric: AnalyticsMetric;
};

export function AnalyticsKpiCard({ metric }: Props) {
  const Icon = metric.icon;
  const isMargin = metric.title.toLowerCase().includes("margin");

  return (
    <div className="group h-full rounded-[24px] border border-border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{metric.title}</p>
          <div className="mt-4 flex items-center gap-3">
            {Icon ? (
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted/10 text-foreground shadow-sm">
                <Icon size={18} />
              </span>
            ) : null}
            <div>
              {metric.loading ? (
                <div className="h-10 w-28 animate-pulse rounded-xl bg-muted/20" />
              ) : (
                <p className={`text-3xl font-semibold tracking-tight ${isMargin ? "text-foreground" : "text-foreground"}`}>{metric.value}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{metric.subtitle}</p>
            </div>
          </div>
        </div>
        {isMargin ? (
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/10">
            <span className={`absolute inset-1 rounded-full ${metric.trend?.startsWith("-") ? "bg-rose-500/10" : "bg-emerald-500/10"}`} />
            <div className="relative flex h-full w-full items-center justify-center rounded-full">
              <div className="h-2.5 w-2.5 rounded-full bg-foreground" />
            </div>
          </div>
        ) : (
          <div className="mt-4 h-16 w-28 rounded-[20px] bg-muted/10 p-2">
            <div className="flex h-full items-end gap-1">
              <span className="block h-2 w-1/4 rounded-full bg-muted/20" />
              <span className="block h-3.5 w-1/4 rounded-full bg-muted/30" />
              <span className="block h-5 w-1/4 rounded-full bg-muted/40" />
              <span className="block h-3 w-1/4 rounded-full bg-muted/30" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm font-medium">
        <span className={`inline-flex items-center gap-2 ${metric.trend?.startsWith("-") ? "text-rose-600" : "text-emerald-600"}`}>
          {metric.trend?.startsWith("-") ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
          {metric.trend}
        </span>
        <span className="text-muted-foreground">{metric.subtitle}</span>
      </div>
    </div>
  );
}
