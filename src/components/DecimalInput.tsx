"use client";

import type { InputHTMLAttributes } from "react";
import { sanitizeDecimalTyping } from "@/lib/decimalInput";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

/** Pole tekstowe akceptujące , i . jako separator dziesiętny (zamiast type=number). */
export function DecimalInput({ value, onChange, onBlur, ...rest }: Props) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(sanitizeDecimalTyping(e.target.value))}
      onBlur={onBlur}
      {...rest}
    />
  );
}
