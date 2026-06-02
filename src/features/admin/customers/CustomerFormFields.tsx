"use client";

import { MapPin } from "lucide-react";
import { formatDict } from "@/i18n";
import { CustomerLocationsPanel } from "./CustomerLocationsPanel";

export interface CustomerFormState {
  firstName: string;
  lastName: string;
  phone: string;
  defaultAddress: string;
  latitude: string;
  longitude: string;
}

export const emptyCustomerForm = (): CustomerFormState => ({
  firstName: "",
  lastName: "",
  phone: "",
  defaultAddress: "",
  latitude: "",
  longitude: "",
});

interface CustomerFormFieldsProps {
  form: CustomerFormState;
  editId: number | null;
  onFormChange: (form: CustomerFormState) => void;
  dict: Record<string, string>;
}

export default function CustomerFormFields({
  form,
  editId,
  onFormChange,
  dict,
}: CustomerFormFieldsProps) {
  const setForm = (next: Partial<CustomerFormState>) => onFormChange({ ...form, ...next });

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">{dict.firstNameLabel}</label>
          <input
            type="text"
            placeholder={dict.firstNamePlaceholder}
            value={form.firstName}
            onChange={(e) => setForm({ firstName: e.target.value })}
            className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">{dict.lastNameLabel}</label>
          <input
            required
            type="text"
            placeholder={dict.lastNamePlaceholder}
            value={form.lastName}
            onChange={(e) => setForm({ lastName: e.target.value })}
            className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">{dict.phoneLabel}</label>
        <input
          type="tel"
          placeholder={dict.phonePlaceholder}
          value={form.phone}
          onChange={(e) => setForm({ phone: e.target.value })}
          className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
        />
      </div>

      {form.defaultAddress || (form.latitude && form.longitude) ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.defaultAddressSummary}
          </p>
          {form.defaultAddress ? (
            <div className="flex items-start gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
              <span>{form.defaultAddress}</span>
            </div>
          ) : (
            <p className="text-sm italic text-zinc-500">{dict.noAddress}</p>
          )}
          {form.latitude && form.longitude ? (
            <p className="text-[11px] text-zinc-500">
              {formatDict(dict.pinSaved, {
                lat: parseFloat(form.latitude).toFixed(5),
                lng: parseFloat(form.longitude).toFixed(5),
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.locationsEditHint}</p>

      {editId ? <CustomerLocationsPanel customerId={editId} /> : null}
    </div>
  );
}
