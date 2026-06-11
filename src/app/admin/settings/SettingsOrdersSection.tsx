"use client";

import { useDictionary } from "@/i18n";
import type { SettingsSnapshot } from "./SettingsForm";

type Props = {
  settings: SettingsSnapshot;
  updateField: <K extends keyof SettingsSnapshot>(field: K, value: SettingsSnapshot[K]) => void;
  mode: "all" | "company" | "orders";
};

export function SettingsOrdersSection({ settings, updateField, mode }: Props) {
  const {
    cancelWindowMinutes,
    geofenceRadiusMeters,
    upcomingOrderReminderMinutes,
    requirePhotoToFinish,
    timeOverrunReminder,
  } = settings;
  const dict = useDictionary().admin.settings;

  return (
    <div
      className={`space-y-6 max-w-3xl ${mode === "all" ? "pt-8 border-t border-zinc-200 dark:border-zinc-800" : ""}`}
    >
      <div>
        <h3 className="font-medium text-zinc-900 dark:text-zinc-200 mb-1">
          {dict.orderSettingsUX}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">{dict.cancelWindowLabel}</label>
          <input
            type="number"
            min="0"
            value={cancelWindowMinutes}
            onChange={(e) => updateField("cancelWindowMinutes", parseInt(e.target.value, 10))}
            className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">{dict.geofenceLabel}</label>
          <input
            type="number"
            step="100"
            min="0"
            value={geofenceRadiusMeters}
            onChange={(e) => updateField("geofenceRadiusMeters", parseInt(e.target.value, 10))}
            className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">{dict.reminderLabel}</label>
          <input
            type="number"
            step="15"
            min="0"
            value={upcomingOrderReminderMinutes}
            onChange={(e) =>
              updateField("upcomingOrderReminderMinutes", parseInt(e.target.value, 10))
            }
            className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none"
          />
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <label className="flex items-center gap-3 cursor-pointer p-3 bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
          <input
            type="checkbox"
            checked={requirePhotoToFinish}
            onChange={(e) => updateField("requirePhotoToFinish", e.target.checked)}
            className="w-5 h-5 text-emerald-500"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-900 dark:text-white">
              {dict.requirePhoto}
            </span>
            <span className="text-xs text-zinc-500">{dict.requirePhotoDesc}</span>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-3 bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
          <input
            type="checkbox"
            checked={timeOverrunReminder}
            onChange={(e) => updateField("timeOverrunReminder", e.target.checked)}
            className="w-5 h-5 text-emerald-500"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-900 dark:text-white">
              {dict.timeOverrun}
            </span>
            <span className="text-xs text-zinc-500">{dict.timeOverrunDesc}</span>
          </div>
        </label>
      </div>
    </div>
  );
}
