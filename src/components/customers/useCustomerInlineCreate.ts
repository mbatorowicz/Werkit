"use client";

import { useState } from "react";
import { useDictionary } from "@/i18n";
import { customerAddressGeocodeQuery, serializeCustomerAddress } from "@/lib/customerAddress";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import type { BaseCustomer } from "@/types/admin";

export function useCustomerInlineCreate(args: {
  initialLastName: string;
  telemetryCategory: "admin" | "lifecycle";
  onCreated: (customer: BaseCustomer) => void;
}) {
  const { initialLastName, telemetryCategory, onCreated } = args;
  const dictionary = useDictionary();
  const ordersDict = dictionary.admin.orders;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const { alert: appAlert } = useAppDialog();

  const [form, setForm] = useState({
    firstName: "",
    lastName: initialLastName,
    phone: "",
    addressStreet: "",
    addressCity: "",
    addressPostalCode: "",
    latitude: "",
    longitude: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addressParts = {
    street: form.addressStreet,
    city: form.addressCity,
    postalCode: form.addressPostalCode,
  };
  const geocodeAddress = customerAddressGeocodeQuery(addressParts);

  const submit = async () => {
    if (!form.lastName.trim()) return;
    setIsSubmitting(true);
    try {
      const defaultAddress = serializeCustomerAddress(addressParts);
      const res = await fetchWithDeviceTelemetry(
        telemetryCategory === "lifecycle"
          ? "Worker wizard: inline customer POST"
          : "Admin orders: inline customer POST",
        "/api/customers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            defaultAddress,
            latitude: form.latitude,
            longitude: form.longitude,
          }),
        },
        { category: telemetryCategory }
      );
      const body = await parseJsonUnknown(res);
      if (!res.ok) {
        const err = readApiErrorString(body);
        await appAlert({ message: appDialogApiMessage(apiErrors, err, ordersDict.error) });
        return;
      }
      const customerId =
        body &&
        typeof body === "object" &&
        typeof (body as { customerId?: unknown }).customerId === "number"
          ? (body as { customerId: number }).customerId
          : null;
      if (customerId == null) {
        await appAlert({ message: ordersDict.error });
        return;
      }
      const phone = form.phone.trim() || null;
      onCreated({
        id: customerId,
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim(),
        phone,
        defaultAddress,
      });
    } catch {
      await appAlert({ message: ordersDict.networkError });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { form, setForm, isSubmitting, addressParts, geocodeAddress, submit };
}
