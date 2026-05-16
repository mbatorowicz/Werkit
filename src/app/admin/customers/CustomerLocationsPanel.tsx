"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Trash2 } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";
import { resolveCompanyBaseCoords } from "@/lib/map/companyBaseLocation";
import type { CustomerLocationRow } from "@/services/CustomerLocationService";

const CustomerRoutePlannerMap = dynamic(
  () => import("@/components/Map/CustomerRoutePlannerMap").then((m) => m.CustomerRoutePlannerMap),
  {
    ssr: false,
    loading: () => <div className="h-[280px] bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />,
  },
);

type LocationForm = {
  label: string;
  address: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
};

const emptyForm = (): LocationForm => ({
  label: "",
  address: "",
  latitude: "",
  longitude: "",
  isDefault: false,
});

function isCustomerLocationRow(v: unknown): v is CustomerLocationRow {
  return v !== null && typeof v === "object" && typeof (v as CustomerLocationRow).id === "number";
}

export function CustomerLocationsPanel({ customerId }: { customerId: number }) {
  const dictionary = getDictionary();
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

  const editorOpen = isDraftOpen || selectedId !== null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [locRes, settingsRes] = await Promise.all([
        fetchWithDeviceTelemetry(
          `Admin: customer ${customerId} locations`,
          `/api/customers/${customerId}/locations`,
          { cache: "no-store" },
          { category: "admin" },
        ),
        fetchWithDeviceTelemetry("Admin: settings for route origin", "/api/settings", { cache: "no-store" }, {
          category: "admin",
        }),
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
    void load();
  }, [load]);

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
      address: loc.address ?? "",
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
    const q = form.address.trim();
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
        { category: "admin" },
      );
      const data = (await res.json()) as { lat?: number | null; lng?: number | null; error?: string };
      if (!res.ok || data.error === "not_found" || typeof data.lat !== "number" || typeof data.lng !== "number") {
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
        address: form.address || null,
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
        { category: "admin" },
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
      { category: "admin" },
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
      ? { lat: Number.parseFloat(form.latitude), lng: Number.parseFloat(form.longitude) }
      : null;

  if (loading) {
    return <p className="text-sm text-zinc-500">{dict.locationsLoading}</p>;
  }

  return (
    <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-700 pt-5 mt-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{dict.locationsTitle}</h3>
        <button
          type="button"
          onClick={startNewLocation}
          className="text-xs flex items-center gap-1 text-emerald-600 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          {dict.locationAdd}
        </button>
      </div>

      {locations.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => selectLocation(loc)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                selectedId === loc.id && !isDraftOpen
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500"
              }`}
            >
              {loc.label}
              {loc.isDefault ? ` (${dict.locationDefaultBadge})` : ""}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">{dict.locationsEmpty}</p>
      )}

      {!editorOpen ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2">{dict.locationSelectPrompt}</p>
      ) : (
        <div className="space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50/80 dark:bg-zinc-950/40">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {isDraftOpen && selectedId === null ? dict.locationNewHeading : dict.locationEditHeading}
          </p>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder={dict.locationLabelPlaceholder}
            className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder={dict.addressPlaceholder}
            className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="rounded border-zinc-400"
            />
            {dict.locationDefaultCheckbox}
          </label>
          <button
            type="button"
            onClick={() => void handleGeocode()}
            disabled={geocodeBusy}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition"
          >
            {geocodeBusy ? dict.geocodeLoading : dict.geocodeBtn}
          </button>
          {routeOrigin ? (
            <CustomerRoutePlannerMap
              routeOrigin={routeOrigin}
              destination={destination}
              waypoints={waypoints}
              onWaypointsChange={setWaypoints}
              onDestinationChange={applyDestination}
              editable
              heightClass="h-[300px]"
            />
          ) : null}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveLocation()}
              className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? dict.locationSaving : dict.locationSave}
            </button>
            {selectedId ? (
              <button
                type="button"
                onClick={() => void deleteLocation(selectedId)}
                className="p-2.5 rounded-lg border border-red-300 text-red-600"
                title={dict.locationDelete}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}


