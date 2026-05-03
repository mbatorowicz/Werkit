"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

export function ProfileSettings({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);

  const toggleNotifications = async () => {
    const newVal = !enabled;
    setEnabled(newVal);
    await fetch("/api/worker/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationsEnabled: newVal })
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 flex justify-between items-center mt-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-lg">
          <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <div className="text-zinc-900 dark:text-white font-medium">Powiadomienia PUSH</div>
          <div className="text-xs text-zinc-500">Zlecenia zbliżające się i opóźnione</div>
        </div>
      </div>
      <label className="relative flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={enabled} onChange={toggleNotifications} />
        <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
      </label>
    </div>
  );
}
