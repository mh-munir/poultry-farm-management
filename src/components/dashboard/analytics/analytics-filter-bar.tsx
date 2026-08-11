"use client";

import { CalendarDays } from "lucide-react";
import type { AnalyticsFilterState, AnalyticsPresetValue } from "./analytics-types";
import { DateInput } from "@/components/ui/date-input";

const presets: Array<{ value: AnalyticsPresetValue; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "month", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

type Props = {
  filters: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
};

export function AnalyticsFilterBar({ filters, onChange }: Props) {
  return (
    <div className="rounded-[24px] border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange({ ...filters, preset: preset.value })}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                filters.preset === preset.value
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                  : "border-border bg-background text-foreground hover:border-slate-300 hover:bg-muted/20"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-border bg-background px-4 py-3 shadow-sm">
          <CalendarDays size={18} className="text-muted-foreground" />
          <DateInput
            value={filters.start}
            onChange={(event) => onChange({ ...filters, start: event.target.value, preset: "custom" })}
            className="min-w-[140px]"
          />
          <span className="text-sm text-muted-foreground">—</span>
          <DateInput
            value={filters.end}
            onChange={(event) => onChange({ ...filters, end: event.target.value, preset: "custom" })}
            className="min-w-[140px]"
          />
        </div>
      </div>
    </div>
  );
}
