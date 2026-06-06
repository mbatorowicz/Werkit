"use client";

import type { ReactNode } from "react";
import {
  INVENTORY_FORM_FIELD,
  INVENTORY_FORM_HINT,
  INVENTORY_FORM_LABEL,
  INVENTORY_FORM_LABEL_REQUIRED,
} from "./adminInventoryFormStyles";

type Props = {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
};

export function AdminFormField({ label, required, hint, htmlFor, children }: Props) {
  const labelClass = required ? INVENTORY_FORM_LABEL_REQUIRED : INVENTORY_FORM_LABEL;
  return (
    <div className={INVENTORY_FORM_FIELD}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint ? <p className={INVENTORY_FORM_HINT}>{hint}</p> : null}
    </div>
  );
}
