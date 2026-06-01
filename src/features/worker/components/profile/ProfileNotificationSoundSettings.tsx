"use client";

import { useCallback, useState } from "react";
import { Play, Volume2 } from "lucide-react";
import { getDictionary } from "@/i18n";
import type { WorkerAlarmKind } from "@/features/worker/lib/workerAlarmTypes";
import { previewAlarmSound } from "@/features/worker/lib/workerAlarmSoundPlayer";
import {
  getNotificationSoundSettings,
  setNotificationSoundEnabled,
  setNotificationSoundVolume,
  setSoundPresetForKind,
} from "@/features/worker/lib/workerNotificationPrefs";
import {
  NOTIFICATION_SOUND_PRESET_IDS,
  type NotificationSoundPresetId,
} from "@/features/worker/lib/workerNotificationSoundPresets";
import { resetWorkerNotificationChannels } from "@/features/worker/lib/workerNotificationChannel";

const toggleClass =
  "w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-50";

const ALARM_KINDS: WorkerAlarmKind[] = ["time_overrun", "order_overdue", "order_upcoming"];

export function ProfileNotificationSoundSettings({
  notificationsEnabled,
}: {
  notificationsEnabled: boolean;
}) {
  const profileDict = getDictionary().worker.profile;
  const [settings, setSettings] = useState(() => getNotificationSoundSettings());
  const [previewingKind, setPreviewingKind] = useState<WorkerAlarmKind | null>(null);

  const syncChannels = useCallback(() => {
    resetWorkerNotificationChannels();
  }, []);

  const toggleSound = () => {
    const next = setNotificationSoundEnabled(!settings.enabled);
    setSettings(next);
    syncChannels();
  };

  const onVolumeChange = (volume: number) => {
    const next = setNotificationSoundVolume(volume);
    setSettings(next);
    syncChannels();
  };

  const onPresetChange = (kind: WorkerAlarmKind, presetId: NotificationSoundPresetId) => {
    const next = setSoundPresetForKind(kind, presetId);
    setSettings(next);
    syncChannels();
  };

  const handlePreview = async (kind: WorkerAlarmKind) => {
    setPreviewingKind(kind);
    try {
      await previewAlarmSound(kind);
    } finally {
      setPreviewingKind(null);
    }
  };

  const presetLabel = (presetId: NotificationSoundPresetId) =>
    profileDict.notificationSoundPresets[presetId];

  const kindLabel = (kind: WorkerAlarmKind) => profileDict.notificationSoundKinds[kind];

  const soundPanelOpen = settings.enabled && notificationsEnabled;

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-500/20">
            <Volume2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">
              {profileDict.notificationSoundTitle}
            </p>
            <p className="text-xs text-zinc-500">{profileDict.notificationSoundDesc}</p>
          </div>
        </div>
        <label className="relative flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={settings.enabled}
            onChange={toggleSound}
            disabled={!notificationsEnabled}
          />
          <div className={toggleClass} />
        </label>
      </div>

      {soundPanelOpen ? (
        <div className="mt-5 space-y-5 border-t border-zinc-200 pt-5 dark:border-zinc-700">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {profileDict.notificationSoundVolumeLabel}
              </span>
              <span className="tabular-nums text-zinc-500">{settings.volume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-emerald-600 dark:bg-zinc-700"
              aria-label={profileDict.notificationSoundVolumeLabel}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {profileDict.notificationSoundPerKindTitle}
            </p>
            {ALARM_KINDS.map((kind) => (
              <div
                key={kind}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {kindLabel(kind)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={settings.presets[kind]}
                    onChange={(e) =>
                      onPresetChange(kind, e.target.value as NotificationSoundPresetId)
                    }
                    className="min-w-[9rem] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    aria-label={kindLabel(kind)}
                  >
                    {NOTIFICATION_SOUND_PRESET_IDS.map((presetId) => (
                      <option key={presetId} value={presetId}>
                        {presetLabel(presetId)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handlePreview(kind)}
                    disabled={previewingKind === kind}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    title={profileDict.notificationSoundPreview}
                  >
                    <Play className="h-4 w-4" />
                    <span className="hidden sm:inline">{profileDict.notificationSoundPreview}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
