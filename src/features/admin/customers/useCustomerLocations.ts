"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseDecimalInput } from "@/lib/decimalInput";
import { useDictionary } from "@/i18n";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { adminApi } from "@/lib/appRoutes";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";
import { resolveCompanyBaseCoords } from "@/lib/map/companyBaseLocation";
import type { CustomerLocationRow } from "@/services/CustomerLocationService";
import {
  customerAddressGeocodeQuery,
  parseCustomerAddress,
  serializeCustomerAddress,
} from "@/lib/customerAddress";

export type LocationForm = {
  label: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
};

const emptyForm = (): LocationForm => ({
  label: "",
  addressStreet: "",
  addressCity: "",
  addressPostalCode: "",
  latitude: "",
  longitude: "",
  isDefault: false,
});

function locationAddressFromStored(address: string | null | undefined) {
  const parts = parseCustomerAddress(address);
  return {
    addressStreet: parts.street,
    addressCity: parts.city,
    addressPostalCode: parts.postalCode,
  };
}

export function locationAddressParts(form: LocationForm) {
  return {
    street: form.addressStreet,
    city: form.addressCity,
    postalCode: form.addressPostalCode,
  };
}

function isCustomerLocationRow(v: unknown): v is CustomerLocationRow {
  return v !== null && typeof v === "object" && typeof (v as CustomerLocationRow).id === "number";
}

export function useCustomerLocations(customerId: number) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.customers;
  const machinesDict = dictionary.admin.machines;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const [locations, setLocations] = useState<CustomerLocationRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [form, setForm] = useState<LocationForm>(emptyForm());
  const [waypoints, setWaypoints] = useState<RouteLngLat[]>([]);
  const [routeOrigin, setRouteOrigin] = useState<RouteLngLat | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const didAutoSelectRef = useRef(false);

  const editorOpen = isDraftOpen || selectedId !== null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [locRes, settingsRes] = await Promise.all([
        fetchWithDeviceTelemetry(
          `Admin: customer ${customerId} locations`,
          `/api/customers/${customerId}/locations`,
          { cache: "no-store" },
          { category: "admin" }
        ),
        fetchWithDeviceTelemetry(
          "Admin: settings for route origin",
          adminApi.settings,
          { cache: "no-store" },
          {
            category: "admin",
          }
        ),
      ]);
      const locData = await parseJsonArray(locRes);
      const rows = locData.filter(isCustomerLocationRow);
      setLocations(rows);
      const settingsBody = await parseJsonUnknown(settingsRes);
      if (settingsBody && typeof settingsBody === "object" && !Array.isArray(settingsBody)) {
        setRouteOrigin(resolveCompanyBaseCoords(settingsBody as Record<string, unknown>));
      } else {
        setRouteOrigin(resolveCompanyBaseCoords(null));
      }
    } catch {
      setRouteOrigin(resolveCompanyBaseCoords(null));
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    didAutoSelectRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || locations.length === 0 || didAutoSelectRef.current) return;
    const preferred = locations.find((l) => l.isDefault) ?? locations[0];
    didAutoSelectRef.current = true;
    setIsDraftOpen(false);
    setSelectedId(preferred.id);
    setForm({
      label: preferred.label,
      ...locationAddressFromStored(preferred.address),
      latitude: preferred.latitude,
      longitude: preferred.longitude,
      isDefault: preferred.isDefault,
    });
    setWaypoints(preferred.routeWaypoints);
  }, [loading, locations]);

  const startNewLocation = () => {
    setSelectedId(null);
    setIsDraftOpen(true);
    setForm(emptyForm());
    setWaypoints([]);
  };

  const selectLocation = (loc: CustomerLocationRow) => {
    setIsDraftOpen(false);
    setSelectedId(loc.id);
    setForm({
      label: loc.label,
      ...locationAddressFromStored(loc.address),
      latitude: loc.latitude,
      longitude: loc.longitude,
      isDefault: loc.isDefault,
    });
    setWaypoints(loc.routeWaypoints);
  };

  const applyDestination = (lat: number, lng: number) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }));
  };

  const handleGeocode = async () => {
    const q = customerAddressGeocodeQuery(locationAddressParts(form)).trim();
    if (!q) {
      await appAlert({ message: dict.geocodeNeedAddress });
      return;
    }
    setGeocodeBusy(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin: geocode customer location",
        `/api/geocode?q=${encodeURIComponent(q)}`,
        { cache: "no-store" },
        { category: "admin" }
      );
      const data = (await res.json()) as {
        lat?: number | null;
        lng?: number | null;
        error?: string;
      };
      if (
        !res.ok ||
        data.error === "not_found" ||
        typeof data.lat !== "number" ||
        typeof data.lng !== "number"
      ) {
        await appAlert({ message: dict.geocodeNoResults });
        return;
      }
      applyDestination(data.lat, data.lng);
    } catch {
      await appAlert({ message: dict.geocodeError });
    } finally {
      setGeocodeBusy(false);
    }
  };

  const saveLocation = async () => {
    if (!form.label.trim() || !form.latitude || !form.longitude) return;
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        address: serializeCustomerAddress(locationAddressParts(form)),
        latitude: form.latitude,
        longitude: form.longitude,
        isDefault: form.isDefault,
        routeWaypoints: waypoints,
      };
      const isUpdate = selectedId !== null && locations.some((l) => l.id === selectedId);
      const url = isUpdate
        ? `/api/customers/${customerId}/locations/${selectedId}`
        : `/api/customers/${customerId}/locations`;
      const method = isUpdate ? "PUT" : "POST";
      const res = await fetchWithDeviceTelemetry(
        "Admin: save customer location",
        url,
        { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
        { category: "admin" }
      );
      if (!res.ok) {
        const err = readApiErrorString(await parseJsonUnknown(res));
        await appAlert({ message: appDialogApiMessage(apiErrors, err, machinesDict.apiError) });
        return;
      }
      const saved = await parseJsonUnknown(res);
      await load();
      if (isCustomerLocationRow(saved)) {
        selectLocation(saved);
      } else {
        setIsDraftOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (id: number) => {
    if (!(await appConfirm({ message: dict.locationConfirmDelete, variant: "danger" }))) return;
    const res = await fetchWithDeviceTelemetry(
      `Admin: delete location ${id}`,
      `/api/customers/${customerId}/locations/${id}`,
      { method: "DELETE" },
      { category: "admin" }
    );
    if (res.ok) {
      if (selectedId === id) {
        setSelectedId(null);
        setIsDraftOpen(false);
        setForm(emptyForm());
        setWaypoints([]);
      }
      await load();
    }
  };

  const destination =
    form.latitude && form.longitude
      ? {
          lat: parseDecimalInput(form.latitude) ?? 0,
          lng: parseDecimalInput(form.longitude) ?? 0,
        }
      : null;

  return {
    locations,
    selectedId,
    isDraftOpen,
    form,
    setForm,
    waypoints,
    setWaypoints,
    routeOrigin,
    loading,
    saving,
    geocodeBusy,
    editorOpen,
    destination,
    startNewLocation,
    selectLocation,
    applyDestination,
    handleGeocode,
    saveLocation,
    deleteLocation,
  };
}
