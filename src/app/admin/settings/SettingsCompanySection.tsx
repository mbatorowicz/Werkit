"use client";

import dynamic from "next/dynamic";
import { getDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { formatCompanyAddressQuery } from "@/lib/map/companyBaseLocation";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { SettingsSnapshot } from "./SettingsForm";

const SettingsMap = dynamic(() => import("@/components/Map/SettingsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
  ),
});

type Props = {
  settings: SettingsSnapshot;
  updateField: <K extends keyof SettingsSnapshot>(field: K, value: SettingsSnapshot[K]) => void;
  geocodeBusy: boolean;
  setGeocodeBusy: (v: boolean) => void;
};

export function SettingsCompanySection({
  settings,
  updateField,
  geocodeBusy,
  setGeocodeBusy,
}: Props) {
  const {
    companyName: name,
    companyAddress: address,
    zipCode,
    city,
    phone,
    email,
    baseLatitude,
    baseLongitude,
  } = settings;

  const baseLat = parseFloat(baseLatitude || "0");
  const baseLng = parseFloat(baseLongitude || "0");
  const dict = getDictionary().admin.settings;
  const customersDict = getDictionary().admin.customers;
  const { alert: appAlert } = useAppDialog();

  const handleGeocodeBase = async () => {
    const q = formatCompanyAddressQuery({ companyAddress: address, zipCode, city });
    if (!q) {
      await appAlert({ message: customersDict.geocodeNeedAddress });
      return;
    }
    setGeocodeBusy(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin settings: geocode company base",
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
        await appAlert({ message: customersDict.geocodeNoResults });
        return;
      }
      updateField("baseLatitude", data.lat.toString());
      updateField("baseLongitude", data.lng.toString());
    } catch {
      await appAlert({ message: customersDict.geocodeError });
    } finally {
      setGeocodeBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-zinc-900 dark:text-zinc-200 mb-1">{dict.generalInfo}</h3>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">{dict.legalNameLabel}</label>
          <input
            type="text"
            placeholder={dict.legalNamePlaceholder}
            value={name ?? ""}
            onChange={(e) => updateField("companyName", e.target.value)}
            className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.addressLabel}</label>
            <input
              type="text"
              placeholder={dict.addressPlaceholder}
              value={address ?? ""}
              onChange={(e) => updateField("companyAddress", e.target.value)}
              className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">{dict.zipCodeLabel}</label>
              <input
                type="text"
                placeholder={dict.zipCodePlaceholder}
                value={zipCode ?? ""}
                onChange={(e) => updateField("zipCode", e.target.value)}
                className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">{dict.cityLabel}</label>
              <input
                type="text"
                placeholder={dict.cityPlaceholder}
                value={city ?? ""}
                onChange={(e) => updateField("city", e.target.value)}
                className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="font-medium text-zinc-900 dark:text-zinc-200 mb-1">
              {dict.gpsLocation}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">{dict.gpsWarning}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleGeocodeBase()}
            disabled={geocodeBusy}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition"
          >
            {geocodeBusy ? customersDict.geocodeLoading : dict.calcGpsBtn}
          </button>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">{dict.lat}</label>
              <input
                type="text"
                readOnly
                value={baseLat.toFixed(6)}
                className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-600 dark:text-zinc-400 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">{dict.lng}</label>
              <input
                type="text"
                readOnly
                value={baseLng.toFixed(6)}
                className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-600 dark:text-zinc-400 text-sm font-mono"
              />
            </div>
          </div>
          <div className="w-full h-[280px] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
            <SettingsMap
              lat={baseLat}
              lng={baseLng}
              onLocationChange={(lat, lng) => {
                updateField("baseLatitude", lat.toString());
                updateField("baseLongitude", lng.toString());
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.phoneLabel}</label>
            <input
              type="text"
              placeholder={dict.phonePlaceholder}
              value={phone ?? ""}
              onChange={(e) => updateField("phone", e.target.value)}
              className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.emailLabel}</label>
            <input
              type="text"
              placeholder={dict.emailPlaceholder}
              value={email ?? ""}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
