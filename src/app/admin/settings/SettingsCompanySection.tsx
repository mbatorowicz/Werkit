"use client";

import { useDictionary } from "@/i18n";
import { INPUT_BASE } from "@/lib/uiTokens";
import { SettingsCompanyGpsSection } from "./SettingsCompanyGpsSection";
import type { SettingsSnapshot } from "./SettingsForm";

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
  const { companyName: name, companyAddress: address, zipCode, city, phone, email } = settings;

  const dictionary = useDictionary();
  const dict = dictionary.admin.settings;

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
            className={INPUT_BASE}
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

        <SettingsCompanyGpsSection
          settings={settings}
          updateField={updateField}
          geocodeBusy={geocodeBusy}
          setGeocodeBusy={setGeocodeBusy}
        />

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
