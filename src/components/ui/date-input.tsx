"use client";

import { useRef, type ComponentProps } from "react";
import { formatDateBD, toDateInputValueBD } from "@/lib/dates";

type Props = Omit<ComponentProps<"input">, "type" | "value" | "defaultValue"> & {
  value: string;
};

export function DateInput({ value, className, ...props }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = value ? formatDateBD(value) : "";

  return (
    <div className="relative">
      <span
        className={`pointer-events-none absolute inset-0 flex items-center px-3 text-sm ${displayValue ? "font-semibold text-slate-900" : "text-slate-400"}`}
      >
        {displayValue || "DD/MM/YYYY"}
      </span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => {
          props.onChange?.(event);
        }}
        onFocus={() => inputRef.current?.showPicker?.()}
        onClick={() => inputRef.current?.showPicker?.()}
        className={`relative h-10 w-full bg-transparent pl-3 pr-2 text-sm font-semibold text-transparent caret-slate-900 outline-none ${className ?? ""}`}
        {...props}
      />
    </div>
  );
}
