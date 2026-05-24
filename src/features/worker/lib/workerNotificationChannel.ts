import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { WorkerAlarmKind } from "@/features/worker/lib/workerAlarmTypes";
import {
  getNotificationSoundSettings,
  isNotificationSoundEnabled,
} from "@/features/worker/lib/workerNotificationPrefs";
import { getNativeSoundFile } from "@/features/worker/lib/workerNotificationSoundPresets";

export const WERKIT_ALERT_CHANNEL_SILENT_ID = "werkit_alerts_silent";

const ALARM_KINDS: WorkerAlarmKind[] = ["time_overrun", "order_overdue", "order_upcoming"];

/** Android: dźwięk kanału jest niezmienny — ID musi zawierać preset, żeby zmiana w profilu działała. */
function channelIdForKind(kind: WorkerAlarmKind, withSound: boolean, presetId?: string): string {
  if (!withSound) return WERKIT_ALERT_CHANNEL_SILENT_ID;
  return `werkit_alerts_${kind}_${presetId ?? "classic"}`;
}

function channelNameForKind(kind: WorkerAlarmKind): string {
  switch (kind) {
    case "time_overrun":
      return "Czas pracy";
    case "order_overdue":
      return "Opóźnione zlecenia";
    case "order_upcoming":
      return "Zbliżające się zlecenia";
    default:
      return "Alerty Werkit";
  }
}

let channelReady = false;

export async function ensureWorkerNotificationChannels(): Promise<void> {
  if (channelReady || typeof window === "undefined" || !Capacitor.isNativePlatform()) return;
  if (!LocalNotifications || typeof LocalNotifications.createChannel !== "function") return;

  const settings = getNotificationSoundSettings();
  const soundOn = settings.enabled;

  await LocalNotifications.createChannel({
    id: WERKIT_ALERT_CHANNEL_SILENT_ID,
    name: "Alerty Werkit (ciche)",
    description: "Przypomnienia bez dźwięku",
    importance: 4,
    vibration: true,
  });

  for (const kind of ALARM_KINDS) {
    const presetId = settings.presets[kind];
    const soundFile = soundOn ? getNativeSoundFile(presetId) : undefined;
    await LocalNotifications.createChannel({
      id: channelIdForKind(kind, true, presetId),
      name: `Alerty Werkit — ${channelNameForKind(kind)}`,
      description: "Przypomnienia o zleceniach i czasie pracy",
      importance: 5,
      sound: soundFile,
      vibration: true,
    });
  }

  channelReady = true;
}

export function getWorkerAlertChannelId(kind: WorkerAlarmKind): string {
  if (!isNotificationSoundEnabled()) return WERKIT_ALERT_CHANNEL_SILENT_ID;
  const presetId = getNotificationSoundSettings().presets[kind];
  return channelIdForKind(kind, true, presetId);
}

/** Po zmianie ustawień dźwięku — ponowna rejestracja kanałów przy następnym alarmie. */
export function resetWorkerNotificationChannels(): void {
  channelReady = false;
}
