"use client";

import dynamic from "next/dynamic";
import { Plus, Trash2 } from "lucide-react";
import { useDictionary } from "@/i18n";
import { CustomerAddressFields } from "@/components/customers/CustomerAddressFields";
import { useCustomerLocations, locationAddressParts } from "./useCustomerLocations";

const CustomerRoutePlannerMap = dynamic(
  () => import("@/components/Map/CustomerRoutePlannerMap").then((m) => m.CustomerRoutePlannerMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
    ),
  }
);

export function CustomerLocationsPanel({ customerId }: { customerId: number }) {
  const dict = useDictionary().admin.customers;
  const {
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
  } = useCustomerLocations(customerId);

  if (loading) {
    return <p className="text-sm text-zinc-500">{dict.locationsLoading}</p>;
  }

  return (
    <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-700 pt-5 mt-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          {dict.locationsTitle}
        </h3>
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
            {isDraftOpen && selectedId === null
              ? dict.locationNewHeading
              : dict.locationEditHeading}
          </p>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder={dict.locationLabelPlaceholder}
            className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm"
          />
          <CustomerAddressFields
            value={locationAddressParts(form)}
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
            inputClass="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm"
            compact
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
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50"
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
