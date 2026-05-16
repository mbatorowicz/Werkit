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
import type { CustomerLocationRow } from "@/services/CustomerLocationService";

const CustomerRoutePlannerMap = dynamic(
  () => import("@/components/Map/CustomerRoutePlannerMap").then((m) => m.CustomerRoutePlannerMap),
  {
    ssr: false,
    loading: () => <div className="h-[200px] bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />,
  },
);

const CustomerMapPicker = dynamic(() => import("./CustomerMapPicker"), { ssr: false });

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

export function CustomerLocationsPanel({ customerId }: { customerId: number }) {
  const dictionary = getDictionary();
  const dict = dictionary.admin.customers;
  const machinesDict = dictionary.admin.machines;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const [locations, setLocations] = useState<CustomerLocationRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm());
  const [waypoints, setWaypoints] = useState<RouteLngLat[]>([]);
  const [routeOrigin, setRouteOrigin] = useState<RouteLngLat>({ lat: 52.2297, lng: 21.0122 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          category: "admin" },
        ),
      ]);
      const locData = await parseJsonArray(locRes);
      const rows = locData.filter(
        (r): r is CustomerLocationRow =>
          r !== null && typeof r === "object" && typeof (r as CustomerLocationRow).id === "number",
      ) as CustomerLocationRow[];
      setLocations(rows);
      const settingsBody = await parseJsonUnknown(settingsRes);
      if (settingsBody && typeof settingsBody === "object" && !Array.isArray(settingsBody)) {
        const s = settingsBody as Record<string, unknown>;
        const lat = Number(s.baseLatitude);
        const lng = Number(s.baseLongitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setRouteOrigin({ lat, lng });
        }
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    if (selectedId !== null || locations.length === 0) return;
    const first = locations[0];
    setSelectedId(first.id);
    setForm({
      label: first.label,
      address: first.address ?? "",
      latitude: first.latitude,
      longitude: first.longitude,
      isDefault: first.isDefault,
    });
    setWaypoints(first.routeWaypoints);
  }, [locations, selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectLocation = (loc: CustomerLocationRow) => {
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
      await load();
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
        setForm(emptyForm());
        setWaypoints([]);
      }
      await load();
    }
  };

  const dest =
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
          onClick={() => {
            setSelectedId(null);
            setForm(emptyForm());
            setWaypoints([]);
          }}
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
              className={`text-xs px-3 py-1.5 rounded-full border ${
                selectedId === loc.id
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300"
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

      <div className="space-y-3">
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
        <CustomerMapPicker
          lat={form.latitude}
          lng={form.longitude}
          address={form.address}
          onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
        />
        {dest ? (
          <CustomerRoutePlannerMap
            routeOrigin={routeOrigin}
            destination={dest}
            waypoints={waypoints}
            onWaypointsChange={setWaypoints}
            editable
          />
        ) : null}
        <div className="flex gap-2">
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
    </div>
  );
}
