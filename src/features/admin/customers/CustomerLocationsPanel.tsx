"use client";

import dynamic from "next/dynamic";
import { Plus, Trash2 } from "lucide-react";
import { useDictionary } from "@/i18n";
import { CustomerAddressFields } from "@/components/customers/CustomerAddressFields";
import { UiButton } from "@/components/UiButton";
import { LINK_ACCENT } from "@/lib/uiChrome";
import { CARD_NESTED, INPUT_BASE } from "@/lib/uiTokens";
import { CustomerLocationChips } from "./CustomerLocationChips";
import { useCustomerLocations, locationAddressParts } from "./useCustomerLocations";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";

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
  const { gpsFlags } = useAdminAbility();
  const showRouteMap = gpsFlags.mapViewEnabled;
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
        <button type="button" onClick={startNewLocation} className={LINK_ACCENT}>
          <Plus className="w-3.5 h-3.5" />
          {dict.locationAdd}
        </button>
      </div>

      <CustomerLocationChips
        locations={locations}
        selectedId={selectedId}
        isDraftOpen={isDraftOpen}
        defaultBadgeLabel={dict.locationDefaultBadge}
        emptyLabel={dict.locationsEmpty}
        onSelect={selectLocation}
      />

      {!editorOpen ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2">{dict.locationSelectPrompt}</p>
      ) : (
        <div className={CARD_NESTED}>
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
            className={INPUT_BASE}
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
            inputClass={INPUT_BASE}
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
          <UiButton
            type="button"
            variant="primaryCompactSm"
            onClick={() => void handleGeocode()}
            disabled={geocodeBusy}
          >
            {geocodeBusy ? dict.geocodeLoading : dict.geocodeBtn}
          </UiButton>
          {showRouteMap && routeOrigin ? (
            <CustomerRoutePlannerMap
              routeOrigin={routeOrigin}
              destination={destination}
              waypoints={gpsFlags.routePlanningEnabled ? waypoints : []}
              onWaypointsChange={setWaypoints}
              onDestinationChange={applyDestination}
              editable={gpsFlags.routePlanningEnabled}
              heightClass="h-[300px]"
            />
          ) : null}
          <div className="flex gap-2 pt-1">
            <UiButton
              type="button"
              variant="primary"
              className="flex-1"
              disabled={saving}
              onClick={() => void saveLocation()}
            >
              {saving ? dict.locationSaving : dict.locationSave}
            </UiButton>
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
