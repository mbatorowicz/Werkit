"use client";

import { useState } from "react";
import { Bell, Volume2 } from "lucide-react";
import { getDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
} from "@/features/worker/lib/workerNotificationPrefs";
import { resetWorkerNotificationChannels } from "@/features/worker/lib/workerNotificationChannel";
import { BiometricLoginSettings } from "./BiometricLoginSettings";

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
  const profileDict = getDictionary().worker.profile;
  const [enabled, setEnabled] = useState(initialEnabled);
  const [soundEnabled, setSoundEnabled] = useState(() => isNotificationSoundEnabled());

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
      { category: "profile" },
    );
  };

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    setNotificationSoundEnabled(newVal);
    resetWorkerNotificationChannels();
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 flex justify-between items-center mt-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-lg">
            <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-zinc-900 dark:text-white font-medium">{profileDict.notificationsTitle}</p>
            <p className="text-xs text-zinc-500">{profileDict.notificationsDesc}</p>
          </div>
        </div>
        <label className="relative flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={enabled} onChange={toggleNotifications} />
          <div className={toggleClass} />
        </label>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 flex justify-between items-center mt-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-lg">
            <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-zinc-900 dark:text-white font-medium">{profileDict.notificationSoundTitle}</p>
            <p className="text-xs text-zinc-500">{profileDict.notificationSoundDesc}</p>
          </div>
        </div>
        <label className="relative flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={soundEnabled}
            onChange={toggleSound}
            disabled={!enabled}
          />
          <div className={toggleClass} />
        </label>
      </div>

      <BiometricLoginSettings
        usernameEmail={usernameEmail}
        role={role}
        initialBiometricLoginEnabled={initialBiometricLoginEnabled}
      />
    </>
  );
}
