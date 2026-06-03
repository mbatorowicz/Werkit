"use client";

import dynamic from "next/dynamic";
import { getDictionary } from "@/i18n";
import { CustomerAddressFields } from "@/components/customers/CustomerAddressFields";
import { CustomerLocationsPanel } from "./CustomerLocationsPanel";
import {
  customerFormAddressParts,
  customerFormGeocodeQuery,
} from "./customerFormApi";

const CustomerMapPicker = dynamic(() => import("./CustomerMapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-800">
      {getDictionary().admin.customers.mapLoading}
    </div>
  ),
});

export interface CustomerFormState {
  firstName: string;
  lastName: string;
  phone: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  latitude: string;
  longitude: string;
}

export const emptyCustomerForm = (): CustomerFormState => ({
  firstName: "",
  lastName: "",
  phone: "",
  addressStreet: "",
  addressCity: "",
  addressPostalCode: "",
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
  const addressParts = customerFormAddressParts(form);
  const geocodeAddress = customerFormGeocodeQuery(form);

  const inputClass =
    "w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none";

  return (
    <div className="space-y-5 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">{dict.firstNameLabel}</label>
          <input
            type="text"
            placeholder={dict.firstNamePlaceholder}
            value={form.firstName}
            onChange={(e) => setForm({ firstName: e.target.value })}
            className={inputClass}
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
            className={inputClass}
          />
        </div>
      </div>

      <CustomerAddressFields
        value={addressParts}
        onChange={(next) =>
          setForm({
            addressStreet: next.street,
            addressCity: next.city,
            addressPostalCode: next.postalCode,
          })
        }
        dict={{
          streetLabel: dict.streetLabel,
          streetPlaceholder: dict.streetPlaceholder,
          cityLabel: dict.cityLabel,
          cityPlaceholder: dict.cityPlaceholder,
          postalCodeLabel: dict.postalCodeLabel,
          postalCodePlaceholder: dict.postalCodePlaceholder,
        }}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">{dict.phoneLabel}</label>
        <input
          type="tel"
          placeholder={dict.phonePlaceholder}
          value={form.phone}
          onChange={(e) => setForm({ phone: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <label className="text-sm font-medium text-zinc-400">{dict.gpsOnMapLabel}</label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{dict.mapHint}</p>
        <CustomerMapPicker
          lat={form.latitude}
          lng={form.longitude}
          address={geocodeAddress}
          onChange={(lat, lng) => setForm({ latitude: lat, longitude: lng })}
        />
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.locationsEditHint}</p>

      {editId ? <CustomerLocationsPanel customerId={editId} /> : null}
    </div>
  );
}
