"use client";

import { useMemo, type ComponentProps } from "react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { bn, enGB } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateBD, toDateInputValueBD } from "@/lib/dates";
import { useLocale } from "@/i18n/provider";
import { convertToBanglaDigits } from "@/lib/localized-formatters";

type Props = Omit<ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange"> & {
  value: string;
  onChange?: (event: { target: { value: string } }) => void;
};

export function DateInput({ value, className, ...props }: Props) {
  const { locale, dict } = useLocale();
  const dateValue = value ? toDateInputValueBD(value) : "";
  const selectedDate = useMemo(() => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }, [dateValue]);

  const displayValue = value
    ? formatDateBD(value)
    : "";
  const localizedDisplayValue = locale === "bn" ? convertToBanglaDigits(displayValue) : displayValue;
  const localizedPlaceholder = dict.common.datePickerPlaceholder;
  const { name, disabled, required, "aria-label": ariaLabel, ...inputProps } = props;

  return (
    <div className={`relative min-h-10 ${className ?? "w-full"}`}>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 flex items-center px-3 text-sm ${localizedDisplayValue ? "font-semibold text-slate-900" : "text-slate-400"}`}
      >
        {localizedDisplayValue || localizedPlaceholder}
      </span>
      {name ? <input type="hidden" name={name} value={dateValue} /> : null}
      <DatePicker
        selected={selectedDate}
        onChange={(date: Date | null) => {
          const nextValue = date
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
            : "";
          props.onChange?.({ target: { value: nextValue } });
        }}
        dateFormat="dd/MM/yyyy"
        locale={locale === "bn" ? bn : enGB}
        renderDayContents={(day) => locale === "bn" ? convertToBanglaDigits(String(day)) : String(day)}
        renderCustomHeader={({ monthDate, decreaseMonth, increaseMonth }) => {
          const monthLabel = format(monthDate, "MMMM yyyy", { locale: locale === "bn" ? bn : enGB });
          return (
            <div className="mx-2 mb-2 flex items-center justify-between">
              <button type="button" aria-label={dict.common.previousMonth} title={dict.common.previousMonth} onClick={decreaseMonth} className="rounded p-1 hover:bg-muted">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">
                {locale === "bn" ? convertToBanglaDigits(monthLabel) : monthLabel}
              </span>
              <button type="button" aria-label={dict.common.nextMonth} title={dict.common.nextMonth} onClick={increaseMonth} className="rounded p-1 hover:bg-muted">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          );
        }}
        todayButton={dict.common.today}
        previousMonthAriaLabel={dict.common.previousMonth}
        previousMonthButtonLabel={dict.common.previousMonth}
        nextMonthAriaLabel={dict.common.nextMonth}
        nextMonthButtonLabel={dict.common.nextMonth}
        ariaLabelClose={dict.common.close}
        showPopperArrow={false}
        popperClassName="z-50"
        wrapperClassName="block w-full"
        disabled={disabled}
        customInput={
          <input
            {...inputProps}
            type="text"
            aria-label={ariaLabel ?? dict.common.datePicker}
            readOnly
            required={required}
            disabled={disabled}
            className="relative z-10 block min-h-10 w-full cursor-pointer bg-transparent text-transparent caret-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      />
    </div>
  );
}
