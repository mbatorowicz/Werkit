"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { BiometricLoginSettings } from "./BiometricLoginSettings";
import { ProfileNotificationSoundSettings } from "./ProfileNotificationSoundSettings";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const toggleClass =
  "w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-50";

export function ProfileSettings({
  initialEnabled,
  initialBiometricLoginEnabled,
  usernameEmail,
  role,
}: {
  initialEnabled: boolean;
  initialBiometricLoginEnabled: boolean;
  usernameEmail: string;
  role: "worker" | "admin";
}) {
  const profileDict = useDictionary().worker.profile;
  const [enabled, setEnabled] = useState(initialEnabled);

  const toggleNotifications = async () => {
    const newVal = !enabled;
    setEnabled(newVal);
    await fetchWithDeviceTelemetry(
      "Worker profile: notifications toggle",
      "/api/worker/profile",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationsEnabled: newVal }),
      },
      { category: "profile" }
    );
  };

  return (
    <>
      <LocaleSwitcher variant="profile" />

      <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-500/20">
            <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">
              {profileDict.notificationsTitle}
            </p>
            <p className="text-xs text-zinc-500">{profileDict.notificationsDesc}</p>
          </div>
        </div>
        <label className="relative flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            onChange={toggleNotifications}
          />
          <div className={toggleClass} />
        </label>
      </div>

      <ProfileNotificationSoundSettings notificationsEnabled={enabled} />

      <BiometricLoginSettings
        usernameEmail={usernameEmail}
        role={role}
        initialBiometricLoginEnabled={initialBiometricLoginEnabled}
      />
    </>
  );
}
