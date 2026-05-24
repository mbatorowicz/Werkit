import type { WorkerAlarmKind } from "@/features/worker/lib/workerAlarmTypes";

export const NOTIFICATION_SOUND_PRESET_IDS = [
  "classic",
  "bell",
  "urgent",
  "soft",
  "chime",
] as const;

export type NotificationSoundPresetId = (typeof NOTIFICATION_SOUND_PRESET_IDS)[number];

/** Pliki w `android/app/src/main/res/raw/` i `public/sounds/` (Capacitor Local Notifications). */
export const NATIVE_SOUND_FILES: Record<NotificationSoundPresetId, string> = {
  classic: "werkit_alert.wav",
  bell: "werkit_sound_bell.wav",
  urgent: "werkit_sound_urgent.wav",
  soft: "werkit_sound_soft.wav",
  chime: "werkit_sound_chime.wav",
};

export const DEFAULT_SOUND_PRESETS: Record<WorkerAlarmKind, NotificationSoundPresetId> = {
  time_overrun: "urgent",
  order_overdue: "bell",
  order_upcoming: "soft",
};

export function isNotificationSoundPresetId(value: string): value is NotificationSoundPresetId {
  return (NOTIFICATION_SOUND_PRESET_IDS as readonly string[]).includes(value);
}

export function getNativeSoundFile(presetId: NotificationSoundPresetId): string {
  return NATIVE_SOUND_FILES[presetId];
}

export function getPublicSoundUrl(presetId: NotificationSoundPresetId): string {
  return `/sounds/${NATIVE_SOUND_FILES[presetId]}`;
}
