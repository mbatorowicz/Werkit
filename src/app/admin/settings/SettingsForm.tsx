"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { adminApi } from "@/lib/appRoutes";
import { resolveCompanyBaseCoords } from "@/lib/map/companyBaseLocation";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useAppDialog } from "@/components/AppDialogProvider";
import { SettingsCompanySection } from "@/app/admin/settings/SettingsCompanySection";
import { SettingsOrdersSection } from "@/app/admin/settings/SettingsOrdersSection";
import { BTN_PRIMARY } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";

export type SettingsSnapshot = {
  id?: number;
  companyName?: string | null;
  companyAddress?: string | null;
  zipCode?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  baseLatitude?: string | null;
  baseLongitude?: string | null;
  cancelWindowMinutes?: number;
  requirePhotoToFinish?: boolean;
  geofenceRadiusMeters?: number;
  timeOverrunReminder?: boolean;
  upcomingOrderReminderMinutes?: number;
};

type SaveStatus = "IDLE" | "SAVING" | "SAVED";

function validateEmail(email: string): boolean {
  if (!email) return true; // email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateSettings(data: SettingsSnapshot): string | null {
  if (!data.companyName?.trim()) {
    return "companyNameRequired";
  }
  if (data.email && !validateEmail(data.email)) {
    return "invalidEmail";
  }
  return null;
}

export default function SettingsForm({
  initialData,
  mode = "all",
}: {
  initialData: SettingsSnapshot | null;
  mode?: "all" | "company" | "orders";
}) {
  const { canMutate } = useAdminAbility();
  const router = useRouter();
  const { alert: appAlert } = useAppDialog();
  const dict = useDictionary().admin.settings;
  const initialBase = resolveCompanyBaseCoords(initialData);

  const [settings, setSettings] = useState<SettingsSnapshot>({
    companyName: initialData?.companyName || "Werkit ERP",
    companyAddress: initialData?.companyAddress || "",
    zipCode: initialData?.zipCode || "",
    city: initialData?.city || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    baseLatitude: initialBase.lat.toString(),
    baseLongitude: initialBase.lng.toString(),
    cancelWindowMinutes: initialData?.cancelWindowMinutes ?? 5,
    requirePhotoToFinish: initialData?.requirePhotoToFinish ?? false,
    geofenceRadiusMeters: initialData?.geofenceRadiusMeters ?? 500,
    timeOverrunReminder: initialData?.timeOverrunReminder ?? true,
    upcomingOrderReminderMinutes: initialData?.upcomingOrderReminderMinutes ?? 120,
  });

  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("IDLE");

  const updateField = useCallback(<K extends keyof SettingsSnapshot>(
    field: K,
    value: SettingsSnapshot[K]
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!canMutate) return;

    const validationError = validateSettings(settings);
    if (validationError) {
      await appAlert({ message: dict[validationError as keyof typeof dict] || dict.saveError });
      return;
    }

    setSaveStatus("SAVING");
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin settings: save POST",
        adminApi.settings,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: settings.companyName,
            companyAddress: settings.companyAddress,
            zipCode: settings.zipCode,
            city: settings.city,
            phone: settings.phone,
            email: settings.email,
            baseLatitude: settings.baseLatitude,
            baseLongitude: settings.baseLongitude,
            cancelWindowMinutes: settings.cancelWindowMinutes,
            requirePhotoToFinish: settings.requirePhotoToFinish,
            geofenceRadiusMeters: settings.geofenceRadiusMeters,
            timeOverrunReminder: settings.timeOverrunReminder,
            upcomingOrderReminderMinutes: settings.upcomingOrderReminderMinutes,
          }),
        },
        { category: "admin" }
      );
      if (res.ok) {
        setSaveStatus("SAVED");
        router.refresh();
        setTimeout(() => setSaveStatus("IDLE"), 2000);
      } else {
        setSaveStatus("IDLE");
        await appAlert({ message: dict.saveError });
      }
    } catch (error) {
      console.error("Settings save failed:", error);
      setSaveStatus("IDLE");
      await appAlert({ message: dict.saveError });
    }
  }, [canMutate, settings, appAlert, dict, router]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950/50">
        <h2 className="font-semibold text-zinc-900 dark:text-white">
          {mode === "orders" ? dict.orderSettings : dict.companyData}
        </h2>
      </div>

      <div
        className={`p-6 md:p-8 space-y-8 ${!canMutate ? "opacity-85 pointer-events-none select-none" : ""}`}
      >
        {(mode === "all" || mode === "company") && (
          <SettingsCompanySection
            settings={settings}
            updateField={updateField}
            geocodeBusy={geocodeBusy}
            setGeocodeBusy={setGeocodeBusy}
          />
        )}

        {(mode === "all" || mode === "orders") && (
          <SettingsOrdersSection
            settings={settings}
            updateField={updateField}
            mode={mode}
          />
        )}

        {canMutate && (
          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-700 flex justify-end items-center gap-4">
            {saveStatus === "SAVED" && (
              <span className="text-emerald-500 text-sm font-medium">{dict.savedSuccess}</span>
            )}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveStatus === "SAVING"}
              className={cn(BTN_PRIMARY, "px-8 py-3 shadow-sm active:scale-95")}
            >
              {saveStatus === "SAVING" ? dict.saving : dict.saveBtn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
