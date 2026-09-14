"use client";

import { useDictionary } from "@/i18n";
import { CONTROL_ROW, INPUT_BASE } from "@/lib/uiTokens";
import { FIELD_LABEL } from "@/lib/uiTypography";
import type { SettingsSnapshot } from "./SettingsForm";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";

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
  const { gpsFlags } = useAdminAbility();

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
          <label className={FIELD_LABEL}>{dict.cancelWindowLabel}</label>
          <input
            type="number"
            min="0"
            value={cancelWindowMinutes}
            onChange={(e) => updateField("cancelWindowMinutes", parseInt(e.target.value, 10))}
            className={INPUT_BASE}
          />
        </div>
        {gpsFlags.geofencingEnabled ? (
          <div className="space-y-2">
            <label className={FIELD_LABEL}>{dict.geofenceLabel}</label>
            <input
              type="number"
              step="100"
              min="0"
              value={geofenceRadiusMeters}
              onChange={(e) => updateField("geofenceRadiusMeters", parseInt(e.target.value, 10))}
              className={INPUT_BASE}
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <label className={FIELD_LABEL}>{dict.reminderLabel}</label>
          <input
            type="number"
            step="15"
            min="0"
            value={upcomingOrderReminderMinutes}
            onChange={(e) =>
              updateField("upcomingOrderReminderMinutes", parseInt(e.target.value, 10))
            }
            className={INPUT_BASE}
          />
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <label className={CONTROL_ROW}>
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

        <label className={CONTROL_ROW}>
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
