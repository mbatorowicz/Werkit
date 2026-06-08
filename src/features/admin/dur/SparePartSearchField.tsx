"use client";

import {
  AdminSearchCombobox,
  type AdminSearchComboboxOption,
} from "@/components/Admin/AdminSearchCombobox";
import { comboboxFeedbackProps } from "@/components/searchFieldStyles";
import { useDictionary } from "@/i18n";

type Props = {
  options: AdminSearchComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  "aria-label": string;
};

/** Pole wyboru części z katalogu DUR (wyszukiwarka, nie ID numeryczne). */
export function SparePartSearchField({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  "aria-label": ariaLabel,
}: Props) {
  const comboboxCommon = comboboxFeedbackProps(useDictionary().admin.orders);

  return (
    <AdminSearchCombobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      aria-label={ariaLabel}
      {...comboboxCommon}
    />
  );
}
