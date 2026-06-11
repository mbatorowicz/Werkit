"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDictionary } from "@/i18n";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";
import { resolveCompanyBaseCoords } from "@/lib/map/companyBaseLocation";
import type { CustomerLocationRow } from "@/services/CustomerLocationService";
import { customerAddressGeocodeQuery } from "@/lib/customerAddress";
import {
  buildLocationPayload,
  emptyLocationForm,
  isCustomerLocationRow,
  locationAddressParts,
  locationDestination,
  locationFormFromRow,
  type LocationForm,
} from "./customerLocationForm";
import { fetchLocationsAndRouteOrigin, geocodeCustomerAddress } from "./customerLocationsApi";

export { locationAddressParts } from "./customerLocationForm";
export type { LocationForm } from "./customerLocationForm";

function requestSaveLocation(
  customerId: number,
  selectedId: number | null,
  isUpdate: boolean,
  form: LocationForm,
  waypoints: RouteLngLat[]
) {
  const url = isUpdate
    ? `/api/customers/${customerId}/locations/${selectedId}`
    : `/api/customers/${customerId}/locations`;
  return fetchWithDeviceTelemetry(
    "Admin: save customer location",
    url,
    {
      method: isUpdate ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildLocationPayload(form, waypoints)),
    },
    { category: "admin" }
  );
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
  const [form, setForm] = useState<LocationForm>(emptyLocationForm());
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
      const { rows, routeOrigin: origin } = await fetchLocationsAndRouteOrigin(customerId);
      setLocations(rows);
      setRouteOrigin(origin);
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
    setForm(locationFormFromRow(preferred));
    setWaypoints(preferred.routeWaypoints);
  }, [loading, locations]);

  const startNewLocation = () => {
    setSelectedId(null);
    setIsDraftOpen(true);
    setForm(emptyLocationForm());
    setWaypoints([]);
  };

  const selectLocation = (loc: CustomerLocationRow) => {
    setIsDraftOpen(false);
    setSelectedId(loc.id);
    setForm(locationFormFromRow(loc));
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
      const coords = await geocodeCustomerAddress(q);
      if (!coords) {
        await appAlert({ message: dict.geocodeNoResults });
        return;
      }
      applyDestination(coords.lat, coords.lng);
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
      const isUpdate = selectedId !== null && locations.some((l) => l.id === selectedId);
      const res = await requestSaveLocation(customerId, selectedId, isUpdate, form, waypoints);
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
        setForm(emptyLocationForm());
        setWaypoints([]);
      }
      await load();
    }
  };

  const destination = locationDestination(form);

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
