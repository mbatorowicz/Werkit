import { LocalNotifications } from "@capacitor/local-notifications";
import { formatDict } from "@/i18n/format";
import type { AppDictionary } from "@/i18n/types";
import type { PlannedNativeAlarm } from "@/features/worker/lib/planNativeWorkerAlarms";
import type { WorkerActiveAlarm } from "@/features/worker/lib/workerAlarmTypes";
import {
  ensureWorkerNotificationChannels,
  getWorkerAlertChannelId,
} from "@/features/worker/lib/workerNotificationChannel";

type AlarmDict = AppDictionary["worker"]["alarms"];

const IMMEDIATE_DELAY_MS = 500;

const scheduledNativeIds = new Set<number>();

function buildActionTypeId(alarmKey: string): string {
  return `werkit_alarm_${alarmKey.replace(/[^a-zA-Z0-9_]/g, "_")}`.slice(0, 64);
}

export async function cancelWorkerAlarmNotification(notificationId: number): Promise<void> {
  if (!LocalNotifications || typeof LocalNotifications.cancel !== "function") return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  } catch {
    // Brak pending — nic.
  }
  scheduledNativeIds.delete(notificationId);
}

export async function scheduleWorkerAlarmNotification(
  alarm: WorkerActiveAlarm,
  dict: AlarmDict,
  at: Date = new Date(Date.now() + IMMEDIATE_DELAY_MS)
): Promise<void> {
  await ensureWorkerNotificationChannels();

  const actions: { id: string; title: string }[] = [{ id: "ok", title: dict.actionOk }];
  if (alarm.canStart && alarm.orderId != null) {
    actions.push({ id: "start", title: dict.actionStart });
  }
  for (const minutes of alarm.snoozeOptions) {
    if (actions.length >= 4) break;
    actions.push({
      id: `snooze_${minutes}`,
      title: formatDict(dict.actionSnooze, { minutes }),
    });
  }

  const actionTypeId = buildActionTypeId(alarm.alarmKey);

  await LocalNotifications.registerActionTypes({
    types: [{ id: actionTypeId, actions }],
  });

  await LocalNotifications.schedule({
    notifications: [
      {
        id: alarm.notificationId,
        title: alarm.title,
        body: alarm.body,
        channelId: getWorkerAlertChannelId(alarm.kind),
        actionTypeId,
        schedule: { at, allowWhileIdle: true },
        extra: {
          alarmKey: alarm.alarmKey,
          orderId: alarm.orderId ?? null,
          kind: alarm.kind,
        },
      },
    ],
  });
  scheduledNativeIds.add(alarm.notificationId);
}

/** Harmonogramuje przyszłe alarmy (dueDate / overrun) i kasuje te, których już nie ma w planie. */
export async function syncNativeWorkerAlarms(
  planned: PlannedNativeAlarm[],
  dict: AlarmDict
): Promise<void> {
  const nextIds = new Set(planned.map((item) => item.alarm.notificationId));
  const toCancel = [...scheduledNativeIds].filter((id) => !nextIds.has(id));
  if (toCancel.length > 0 && typeof LocalNotifications.cancel === "function") {
    try {
      await LocalNotifications.cancel({ notifications: toCancel.map((id) => ({ id })) });
    } catch {
      // ignore
    }
    for (const id of toCancel) scheduledNativeIds.delete(id);
  }

  for (const item of planned) {
    await scheduleWorkerAlarmNotification(item.alarm, dict, new Date(item.atMs));
  }
}
