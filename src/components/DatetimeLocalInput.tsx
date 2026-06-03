"use client";

import { useMemo } from "react";
import { DateInput } from "@/components/DateInput";
import { dateInputClassName, type DateInputVariant } from "@/components/datetimeFieldStyles";
import {
  DATETIME_LOCAL_TIME_OPTIONS,
  joinDatetimeLocal,
  splitDatetimeLocal,
} from "@/lib/datetimeLocal";

type Props = {
  value: string;
  onChange: (value: string) => void;
  variant?: DateInputVariant;
  className?: string;
  id?: string;
  disabled?: boolean;
  timePlaceholder?: string;
  "aria-label"?: string;
};

/**
 * Termin zlecenia: data (natywny picker) + godzina (lista co 10 min — bez minut 1–9 itd.).
 */
export function DatetimeLocalInput({
  value,
  onChange,
  variant = "admin",
  className = "",
  id,
  disabled = false,
  timePlaceholder = "--:--",
  "aria-label": ariaLabel,
}: Props) {
  const fieldClass = className.trim() ? className : dateInputClassName(variant);
  const { date, time } = useMemo(() => splitDatetimeLocal(value), [value]);

  const handleDateChange = (nextDate: string) => {
    if (!nextDate.trim()) {
      onChange("");
      return;
    }
    const nextTime = time || DATETIME_LOCAL_TIME_OPTIONS[0];
    onChange(joinDatetimeLocal(nextDate, nextTime));
  };

  const handleTimeChange = (nextTime: string) => {
    if (!nextTime) {
      onChange("");
      return;
    }
    if (!date.trim()) {
      return;
    }
    onChange(joinDatetimeLocal(date, nextTime));
  };

  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]"
      role="group"
      aria-label={ariaLabel}
    >
      <DateInput
        id={id}
        variant={variant}
        value={date}
        onChange={handleDateChange}
        disabled={disabled}
        className={fieldClass}
        aria-label={ariaLabel ? `${ariaLabel} — data` : undefined}
      />
      <select
        value={time}
        disabled={disabled || !date}
        onChange={(e) => handleTimeChange(e.target.value)}
        className={`${fieldClass} min-w-[6.5rem] sm:w-28`}
        aria-label={ariaLabel ? `${ariaLabel} — godzina` : undefined}
      >
        <option value="">{timePlaceholder}</option>
        {DATETIME_LOCAL_TIME_OPTIONS.map((slot) => (
          <option key={slot} value={slot}>
            {slot}
          </option>
        ))}
      </select>
    </div>
  );
}
