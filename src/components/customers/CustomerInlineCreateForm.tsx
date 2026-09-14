"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { CustomerAddressFields } from "@/components/customers/CustomerAddressFields";
import { parseDecimalInput } from "@/lib/decimalInput";
import { formatDict, useDictionary } from "@/i18n";
import { useCustomerInlineCreate } from "@/components/customers/useCustomerInlineCreate";
import { UiButton } from "@/components/UiButton";
import { cn } from "@/lib/cn";
import { CARD_NESTED, INPUT_BASE } from "@/lib/uiTokens";
import { FIELD_LABEL_COMPACT } from "@/lib/uiTypography";
import type { BaseCustomer } from "@/types/admin";

function InlineCustomerMapPickerLoading() {
  const mapLoading = useDictionary().admin.customers.mapLoading;
  return (
    <div className="flex h-[200px] w-full items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-800">
      {mapLoading}
    </div>
  );
}

const CustomerMapPicker = dynamic(() => import("@/features/admin/customers/CustomerMapPicker"), {
  ssr: false,
  loading: () => <InlineCustomerMapPickerLoading />,
});

export type CustomerInlineCreateFormProps = {
  initialLastName?: string;
  onCreated: (customer: BaseCustomer) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  telemetryCategory?: "admin" | "lifecycle";
};

export function CustomerInlineCreateForm({
  initialLastName = "",
  onCreated,
  onCancel,
  submitLabel,
  cancelLabel,
  telemetryCategory = "admin",
}: CustomerInlineCreateFormProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.customers;

  const { form, setForm, isSubmitting, addressParts, geocodeAddress, submit } =
    useCustomerInlineCreate({ initialLastName, telemetryCategory, onCreated });

  const inputClass = INPUT_BASE;

  return (
    <div
      role="group"
      aria-label={dict.modalCreateTitle}
      className={cn(CARD_NESTED, "mt-3 space-y-4")}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          e.preventDefault();
          e.stopPropagation();
          void submit();
        }
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={FIELD_LABEL_COMPACT}>
            {dict.firstNameLabel}
          </label>
          <input
            type="text"
            placeholder={dict.firstNamePlaceholder}
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={FIELD_LABEL_COMPACT}>
            {dict.lastNameLabel}
          </label>
          <input
            required
            type="text"
            placeholder={dict.lastNamePlaceholder}
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <CustomerAddressFields
        value={addressParts}
        onChange={(next) =>
          setForm({
            ...form,
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
        inputClass={inputClass}
        compact
      />
      <div className="space-y-1.5">
        <label className={FIELD_LABEL_COMPACT}>
          {dict.phoneLabel}
        </label>
        <input
          type="tel"
          placeholder={dict.phonePlaceholder}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="space-y-1.5">
        <label className={FIELD_LABEL_COMPACT}>
          {dict.gpsOnMapLabel}
        </label>
        <CustomerMapPicker
          lat={form.latitude}
          lng={form.longitude}
          address={geocodeAddress}
          onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
        />
        {form.latitude && form.longitude ? (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {formatDict(dict.pinSaved, {
              lat: (parseDecimalInput(form.latitude) ?? 0).toFixed(5),
              lng: (parseDecimalInput(form.longitude) ?? 0).toFixed(5),
            })}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UiButton
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelLabel ?? dictionary.admin.ui.modalCancel}
        </UiButton>
        <UiButton
          type="button"
          variant="primary"
          disabled={isSubmitting}
          onClick={() => void submit()}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel ?? dict.create}
        </UiButton>
      </div>
    </div>
  );
}
