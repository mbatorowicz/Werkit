import type { WorkerAlarmKind } from "@/features/worker/lib/workerAlarmTypes";
import {
  DEFAULT_SOUND_PRESETS,
  isNotificationSoundPresetId,
  type NotificationSoundPresetId,
} from "@/features/worker/lib/workerNotificationSoundPresets";

const LEGACY_SOUND_ENABLED_KEY = "werkit_notification_sound_enabled";
const SETTINGS_KEY = "werkit_notification_sound_v2";

export type WorkerNotificationSoundSettings = {
  enabled: boolean;
  volume: number;
  presets: Record<WorkerAlarmKind, NotificationSoundPresetId>;
};

const DEFAULT_SETTINGS: WorkerNotificationSoundSettings = {
  enabled: true,
  volume: 85,
  presets: { ...DEFAULT_SOUND_PRESETS },
};

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.volume;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizePresets(
  raw: Partial<Record<WorkerAlarmKind, string>> | undefined
): Record<WorkerAlarmKind, NotificationSoundPresetId> {
  const out = { ...DEFAULT_SOUND_PRESETS };
  if (!raw) return out;
  for (const kind of Object.keys(DEFAULT_SOUND_PRESETS) as WorkerAlarmKind[]) {
    const candidate = raw[kind];
    if (candidate && isNotificationSoundPresetId(candidate)) {
      out[kind] = candidate;
    }
  }
  return out;
}

function canUseStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function readLegacyEnabled(): boolean | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(LEGACY_SOUND_ENABLED_KEY);
  if (raw === null) return null;
  return raw === "true";
}

function parseStoredSettings(): WorkerNotificationSoundSettings {
  if (!canUseStorage()) return DEFAULT_SETTINGS;

  const raw = localStorage.getItem(SETTINGS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<WorkerNotificationSoundSettings>;
      return {
        enabled: parsed.enabled !== false,
        volume: clampVolume(parsed.volume ?? DEFAULT_SETTINGS.volume),
        presets: normalizePresets(parsed.presets),
      };
    } catch {
      /* fall through to legacy / defaults */
    }
  }

  const legacyEnabled = readLegacyEnabled();
  return {
    ...DEFAULT_SETTINGS,
    enabled: legacyEnabled ?? DEFAULT_SETTINGS.enabled,
  };
}

function persistSettings(settings: WorkerNotificationSoundSettings): void {
  if (!canUseStorage()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem(LEGACY_SOUND_ENABLED_KEY, settings.enabled ? "true" : "false");
}

export function getNotificationSoundSettings(): WorkerNotificationSoundSettings {
  return parseStoredSettings();
}

export function saveNotificationSoundSettings(
  patch: Partial<WorkerNotificationSoundSettings>
): WorkerNotificationSoundSettings {
  const next: WorkerNotificationSoundSettings = {
    ...getNotificationSoundSettings(),
    ...patch,
    volume:
      patch.volume != null ? clampVolume(patch.volume) : getNotificationSoundSettings().volume,
    presets: patch.presets
      ? normalizePresets({ ...getNotificationSoundSettings().presets, ...patch.presets })
      : getNotificationSoundSettings().presets,
  };
  persistSettings(next);
  return next;
}

export function setSoundPresetForKind(
  kind: WorkerAlarmKind,
  presetId: NotificationSoundPresetId
): WorkerNotificationSoundSettings {
  return saveNotificationSoundSettings({
    presets: { ...getNotificationSoundSettings().presets, [kind]: presetId },
  });
}

export function getSoundPresetForKind(kind: WorkerAlarmKind): NotificationSoundPresetId {
  return getNotificationSoundSettings().presets[kind];
}

export function isNotificationSoundEnabled(): boolean {
  return getNotificationSoundSettings().enabled;
}

export function setNotificationSoundEnabled(enabled: boolean): WorkerNotificationSoundSettings {
  return saveNotificationSoundSettings({ enabled });
}

export function getNotificationSoundVolume(): number {
  return getNotificationSoundSettings().volume;
}

export function setNotificationSoundVolume(volume: number): WorkerNotificationSoundSettings {
  return saveNotificationSoundSettings({ volume: clampVolume(volume) });
}
