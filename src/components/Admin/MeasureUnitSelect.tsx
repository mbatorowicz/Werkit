"use client";

import { measureUnitSelectValues } from "@/lib/measureUnits";
import { INVENTORY_FORM_CONTROL } from "./adminInventoryFormStyles";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  unitLabels: Record<string, string>;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export function MeasureUnitSelect({
  id,
  value,
  onChange,
  unitLabels,
  disabled = false,
  required = false,
  className,
}: Props) {
  const options = measureUnitSelectValues(value);

  return (
    <select
      id={id}
      value={value}
      required={required}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? INVENTORY_FORM_CONTROL}
    >
      {options.map((unit) => (
        <option key={unit} value={unit}>
          {unitLabels[unit] ?? unit}
        </option>
      ))}
    </select>
  );
}
