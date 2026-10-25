"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { AnalyticsFilterState, AnalyticsPresetValue } from "./analytics-types";
import { DateInput } from "@/components/ui/date-input";
import { useLocale } from "@/i18n/provider";

type Props = {
  filters: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
};

export function AnalyticsFilterBar({ filters, onChange }: Props) {
  const { dict } = useLocale();
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const dropdownId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const presets: Array<{ value: AnalyticsPresetValue; label: string }> = [
    { value: "today", label: dict.common.today },
    { value: "yesterday", label: dict.common.yesterday },
    { value: "7", label: dict.analytics.last7Days },
    { value: "30", label: dict.analytics.last30Days },
    { value: "month", label: dict.analytics.thisMonth },
    { value: "lastMonth", label: dict.analytics.lastMonth },
    { value: "custom", label: dict.analytics.customRange },
  ];
  const selectedPreset = presets.find((preset) => preset.value === filters.preset) ?? presets[0];

  useEffect(() => {
    if (!isPresetMenuOpen) return;

    const selectedIndex = presets.findIndex((preset) => preset.value === selectedPreset.value);
    optionRefs.current[selectedIndex]?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !dropdownRef.current?.contains(event.target)) {
        setIsPresetMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPresetMenuOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isPresetMenuOpen, presets, selectedPreset.value]);

  function handlePresetSelect(value: AnalyticsPresetValue) {
    setIsPresetMenuOpen(false);
    if (value === "custom") {
      onChange({ start: "", end: "", preset: "custom" });
      return;
    }

    onChange({ ...filters, preset: value });
  }

  function handleOptionKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % presets.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + presets.length) % presets.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = presets.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      optionRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div className="rounded-[24px] border border-border bg-gradient-to-br from-emerald-50/50 via-card to-card p-4 shadow-sm dark:from-emerald-950/10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px]" ref={dropdownRef}>
            <div className={`group flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/70 p-2 shadow-sm shadow-emerald-950/[0.04] transition hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-950/[0.07] dark:border-emerald-900/70 dark:from-slate-950 dark:via-emerald-950/30 dark:to-teal-950/30 ${isPresetMenuOpen ? "border-emerald-400" : ""}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/20">
              <SlidersHorizontal aria-hidden="true" size={17} />
            </span>
            <button
              ref={triggerRef}
              type="button"
              aria-label={dict.analytics.dateRange}
              aria-haspopup="listbox"
              aria-expanded={isPresetMenuOpen}
              aria-controls={dropdownId}
              onClick={() => setIsPresetMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setIsPresetMenuOpen(true);
                }
              }}
              className="flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-xl px-1 text-left text-sm font-semibold text-slate-800 outline-none focus-visible:ring-0 dark:text-emerald-50"
            >
              <span className="truncate">{selectedPreset.label}</span>
              <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-emerald-700 transition-transform dark:text-emerald-300 ${isPresetMenuOpen ? "rotate-180" : ""}`} />
            </button>
            </div>
            {isPresetMenuOpen ? (
              <div
                id={dropdownId}
                role="listbox"
                aria-label={dict.analytics.dateRange}
                onKeyDown={handleOptionKeyDown}
                className="absolute left-0 top-[calc(100%+0.6rem)] z-50 w-full overflow-hidden rounded-2xl border border-emerald-100 bg-card p-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-black/[0.03] dark:border-emerald-900/70"
              >
                {presets.map((preset, index) => {
                  const selected = filters.preset === preset.value;
                  return (
                    <button
                      key={preset.value}
                      ref={(element) => { optionRefs.current[index] = element; }}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => handlePresetSelect(preset.value)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                        selected
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                          : "text-foreground hover:bg-emerald-50 hover:text-emerald-900 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-100"
                      }`}
                    >
                      <span>{preset.label}</span>
                      {selected ? <Check aria-hidden="true" size={16} /> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3 rounded-[20px] border border-border/80 bg-card/90 px-3 py-2.5 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CalendarDays size={18} />
            </span>
            <DateInput
              value={filters.start}
              onChange={(event) => onChange({ ...filters, start: event.target.value, preset: "custom" })}
              aria-label={dict.analytics.dateRangeStart}
              className="min-w-[130px] rounded-xl border border-border bg-background px-1 transition hover:border-emerald-300"
            />
            <span className="text-sm font-medium text-muted-foreground">—</span>
            <DateInput
              value={filters.end}
              onChange={(event) => onChange({ ...filters, end: event.target.value, preset: "custom" })}
              aria-label={dict.analytics.dateRangeEnd}
              className="min-w-[130px] rounded-xl border border-border bg-background px-1 transition hover:border-emerald-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
