"use client";

import type { CustomerAddressParts } from "@/lib/customerAddress";
import { INPUT_BASE } from "@/lib/uiTokens";

const defaultInputClass = INPUT_BASE;

type Props = {
  value: CustomerAddressParts;
  onChange: (next: CustomerAddressParts) => void;
  dict: {
    streetLabel: string;
    streetPlaceholder: string;
    cityLabel: string;
    cityPlaceholder: string;
    postalCodeLabel: string;
    postalCodePlaceholder: string;
  };
  inputClass?: string;
  compact?: boolean;
};

export function CustomerAddressFields({
  value,
  onChange,
  dict,
  inputClass = defaultInputClass,
  compact = false,
}: Props) {
  const labelClass = compact
    ? "text-xs font-semibold uppercase tracking-wide text-zinc-500"
    : "text-sm font-medium text-zinc-400";
  const gap = compact ? "space-y-1.5" : "space-y-2";

  const patch = (part: Partial<CustomerAddressParts>) => onChange({ ...value, ...part });

  return (
    <div className={`grid grid-cols-1 gap-3 ${compact ? "" : "sm:gap-4"}`}>
      <div className={gap}>
        <label className={labelClass}>{dict.streetLabel}</label>
        <input
          type="text"
          placeholder={dict.streetPlaceholder}
          value={value.street}
          onChange={(e) => patch({ street: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${compact ? "" : "sm:gap-4"}`}>
        <div className={gap}>
          <label className={labelClass}>{dict.postalCodeLabel}</label>
          <input
            type="text"
            placeholder={dict.postalCodePlaceholder}
            value={value.postalCode}
            onChange={(e) => patch({ postalCode: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className={gap}>
          <label className={labelClass}>{dict.cityLabel}</label>
          <input
            type="text"
            placeholder={dict.cityPlaceholder}
            value={value.city}
            onChange={(e) => patch({ city: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
