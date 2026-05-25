"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { adminApi } from "@/lib/appRoutes";
import { resolveCompanyBaseCoords } from "@/lib/map/companyBaseLocation";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useAppDialog } from "@/components/AppDialogProvider";
import { SettingsCompanySection } from "@/app/admin/settings/SettingsCompanySection";
import { SettingsOrdersSection } from "@/app/admin/settings/SettingsOrdersSection";

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
  const dict = getDictionary().admin.settings;
  const initialBase = resolveCompanyBaseCoords(initialData);
  const [name, setName] = useState(initialData?.companyName || "Werkit ERP");
  const [address, setAddress] = useState(initialData?.companyAddress || "");
  const [zipCode, setZipCode] = useState(initialData?.zipCode || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [baseLat, setBaseLat] = useState(initialBase.lat);
  const [baseLng, setBaseLng] = useState(initialBase.lng);
  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const [cancelWindowMinutes, setCancelWindowMinutes] = useState<number>(initialData?.cancelWindowMinutes ?? 5);
  const [requirePhotoToFinish, setRequirePhotoToFinish] = useState<boolean>(initialData?.requirePhotoToFinish ?? false);
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState<number>(initialData?.geofenceRadiusMeters ?? 500);
  const [timeOverrunReminder, setTimeOverrunReminder] = useState<boolean>(initialData?.timeOverrunReminder ?? true);
  const [upcomingOrderReminderMinutes, setUpcomingOrderReminderMinutes] = useState<number>(
    initialData?.upcomingOrderReminderMinutes ?? 120,
  );

  const [saveStatus, setSaveStatus] = useState<"IDLE" | "SAVING" | "SAVED">("IDLE");

  const handleSave = async () => {
    if (!canMutate) return;
    setSaveStatus("SAVING");
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin settings: save POST",
        adminApi.settings,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: name,
            companyAddress: address,
            zipCode,
            city,
            phone,
            email,
            baseLatitude: baseLat.toString(),
            baseLongitude: baseLng.toString(),
            cancelWindowMinutes,
            requirePhotoToFinish,
            geofenceRadiusMeters,
            timeOverrunReminder,
            upcomingOrderReminderMinutes,
          }),
        },
        { category: "admin" },
      );
      if (res.ok) {
        setSaveStatus("SAVED");
        router.refresh();
        setTimeout(() => setSaveStatus("IDLE"), 2000);
      } else {
        setSaveStatus("IDLE");
        await appAlert({ message: dict.saveError });
      }
    } catch {
      setSaveStatus("IDLE");
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950/50">
        <h2 className="font-semibold text-zinc-900 dark:text-white">
          {mode === "orders" ? dict.orderSettings : dict.companyData}
        </h2>
      </div>

      <div className={`p-6 md:p-8 space-y-8 ${!canMutate ? "opacity-85 pointer-events-none select-none" : ""}`}>
        {(mode === "all" || mode === "company") && (
          <SettingsCompanySection
            name={name}
            setName={setName}
            address={address}
            setAddress={setAddress}
            zipCode={zipCode}
            setZipCode={setZipCode}
            city={city}
            setCity={setCity}
            phone={phone}
            setPhone={setPhone}
            email={email}
            setEmail={setEmail}
            baseLat={baseLat}
            baseLng={baseLng}
            setBaseLat={setBaseLat}
            setBaseLng={setBaseLng}
            geocodeBusy={geocodeBusy}
            setGeocodeBusy={setGeocodeBusy}
          />
        )}

        {(mode === "all" || mode === "orders") && (
          <SettingsOrdersSection
            cancelWindowMinutes={cancelWindowMinutes}
            setCancelWindowMinutes={setCancelWindowMinutes}
            geofenceRadiusMeters={geofenceRadiusMeters}
            setGeofenceRadiusMeters={setGeofenceRadiusMeters}
            upcomingOrderReminderMinutes={upcomingOrderReminderMinutes}
            setUpcomingOrderReminderMinutes={setUpcomingOrderReminderMinutes}
            requirePhotoToFinish={requirePhotoToFinish}
            setRequirePhotoToFinish={setRequirePhotoToFinish}
            timeOverrunReminder={timeOverrunReminder}
            setTimeOverrunReminder={setTimeOverrunReminder}
            mode={mode}
          />
        )}

        {canMutate && (
          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-700 flex justify-end items-center gap-4">
            {saveStatus === "SAVED" && <span className="text-emerald-500 text-sm font-medium">{dict.savedSuccess}</span>}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveStatus === "SAVING"}
              className="bg-amber-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-amber-500 transition shadow-sm active:scale-95"
            >
              {saveStatus === "SAVING" ? dict.saving : dict.saveBtn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
