import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNotificationSoundEnabled } from "@/features/worker/lib/workerNotificationPrefs";

export const WERKIT_ALERT_CHANNEL_ID = "werkit_alerts";
export const WERKIT_ALERT_SOUND = "werkit_alert.wav";
const WERKIT_ALERT_CHANNEL_SILENT_ID = "werkit_alerts_silent";

let channelReady = false;

export async function ensureWorkerNotificationChannels(): Promise<void> {
  if (channelReady || typeof window === "undefined" || !Capacitor.isNativePlatform()) return;
  if (!LocalNotifications || typeof LocalNotifications.createChannel !== "function") return;

  const soundOn = isNotificationSoundEnabled();

  await LocalNotifications.createChannel({
    id: WERKIT_ALERT_CHANNEL_ID,
    name: "Alerty Werkit",
    description: "Przypomnienia o zleceniach i czasie pracy",
    importance: 5,
    sound: soundOn ? WERKIT_ALERT_SOUND : undefined,
    vibration: true,
  });

  await LocalNotifications.createChannel({
    id: WERKIT_ALERT_CHANNEL_SILENT_ID,
    name: "Alerty Werkit (ciche)",
    description: "Przypomnienia bez dźwięku",
    importance: 4,
    vibration: true,
  });

  channelReady = true;
}

export function getWorkerAlertChannelId(): string {
  return isNotificationSoundEnabled() ? WERKIT_ALERT_CHANNEL_ID : WERKIT_ALERT_CHANNEL_SILENT_ID;
}

/** Po zmianie przełącznika dźwięku — ponowna rejestracja kanałów przy następnym alarmie. */
export function resetWorkerNotificationChannels(): void {
  channelReady = false;
}
