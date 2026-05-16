const SOUND_ENABLED_KEY = "werkit_notification_sound_enabled";

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(SOUND_ENABLED_KEY);
  if (raw === null) return true;
  return raw === "true";
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? "true" : "false");
}
