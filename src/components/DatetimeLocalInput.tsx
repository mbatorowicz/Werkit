"use client";

import {
  DATETIME_LOCAL_STEP_SECONDS,
  roundDatetimeLocalToStep,
} from "@/lib/datetimeLocal";
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

/** Termin zlecenia — natywny picker z krokiem 10 min i spójnym stylem formularza. */
export function DatetimeLocalInput({
  value,
  onChange,
  variant = "admin",
  className = "",
  id,
  disabled = false,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <input
      id={id}
      type="datetime-local"
      step={DATETIME_LOCAL_STEP_SECONDS}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(roundDatetimeLocalToStep(e.target.value))}
      className={className.trim() ? className : dateInputClassName(variant)}
    />
  );
}
