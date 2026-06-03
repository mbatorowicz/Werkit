"use client";

import { dateInputClassName, type DateInputVariant } from "@/components/datetimeFieldStyles";

type Props = {
  value: string;
  onChange: (value: string) => void;
  variant?: DateInputVariant;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

/** Pole daty (bez czasu) — ten sam styl co termin zlecenia. */
export function DateInput({
  value,
  onChange,
  variant = "compact",
  className = "",
  id,
  disabled = false,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <input
      id={id}
      type="date"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className={className.trim() ? className : dateInputClassName(variant)}
    />
  );
}
