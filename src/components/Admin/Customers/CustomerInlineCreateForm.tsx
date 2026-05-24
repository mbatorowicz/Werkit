"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { formatDict, getDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import type { BaseCustomer } from "@/types/admin";

const CustomerMapPicker = dynamic(() => import("@/app/admin/customers/CustomerMapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-800">
      {getDictionary().admin.customers.mapLoading}
    </div>
  ),
});

export type CustomerInlineCreateFormProps = {
  initialLastName?: string;
  onCreated: (customer: BaseCustomer) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
};

export function CustomerInlineCreateForm({
  initialLastName = "",
  onCreated,
  onCancel,
  submitLabel,
  cancelLabel,
}: CustomerInlineCreateFormProps) {
  const dictionary = getDictionary();
  const dict = dictionary.admin.customers;
  const ordersDict = dictionary.admin.orders;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const { alert: appAlert } = useAppDialog();

  const [form, setForm] = useState({
    firstName: "",
    lastName: initialLastName,
    defaultAddress: "",
    latitude: "",
    longitude: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lastName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin orders: inline customer POST",
        "/api/customers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
        { category: "admin" },
      );
      const body = await parseJsonUnknown(res);
      if (!res.ok) {
        const err = readApiErrorString(body);
        await appAlert({ message: appDialogApiMessage(apiErrors, err, ordersDict.error) });
        return;
      }
      const customerId =
        body && typeof body === "object" && typeof (body as { customerId?: unknown }).customerId === "number"
          ? (body as { customerId: number }).customerId
          : null;
      if (customerId == null) {
        await appAlert({ message: ordersDict.error });
        return;
      }
      onCreated({
        id: customerId,
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim(),
      });
    } catch {
      await appAlert({ message: ordersDict.networkError });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{dict.firstNameLabel}</label>
          <input
            type="text"
            placeholder={dict.firstNamePlaceholder}
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{dict.lastNameLabel}</label>
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
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{dict.addressLabel}</label>
        <input
          type="text"
          placeholder={dict.addressPlaceholder}
          value={form.defaultAddress}
          onChange={(e) => setForm({ ...form, defaultAddress: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{dict.gpsOnMapLabel}</label>
        <CustomerMapPicker
          lat={form.latitude}
          lng={form.longitude}
          address={form.defaultAddress}
          onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
        />
        {form.latitude && form.longitude ? (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {formatDict(dict.pinSaved, {
              lat: parseFloat(form.latitude).toFixed(5),
              lng: parseFloat(form.longitude).toFixed(5),
            })}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {cancelLabel ?? dictionary.admin.ui.modalCancel}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel ?? dict.create}
        </button>
      </div>
    </form>
  );
}
