import { LocalNotifications } from "@capacitor/local-notifications";
import { formatDict } from "@/i18n/format";
import type { AppDictionary } from "@/i18n/types";
import type { WorkerActiveAlarm } from "@/features/worker/lib/workerAlarmTypes";
import {
  ensureWorkerNotificationChannels,
  getWorkerAlertChannelId,
} from "@/features/worker/lib/workerNotificationChannel";

type AlarmDict = AppDictionary["worker"]["alarms"];

function buildActionTypeId(alarmKey: string): string {
  return `werkit_alarm_${alarmKey.replace(/[^a-zA-Z0-9_]/g, "_")}`.slice(0, 64);
}

export async function scheduleWorkerAlarmNotification(
  alarm: WorkerActiveAlarm,
  dict: AlarmDict,
): Promise<void> {
  await ensureWorkerNotificationChannels();

  const actions: { id: string; title: string }[] = [
    { id: "ok", title: dict.actionOk },
  ];
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
        channelId: getWorkerAlertChannelId(),
        actionTypeId,
        schedule: { at: new Date(Date.now() + 500) },
        extra: {
          alarmKey: alarm.alarmKey,
          orderId: alarm.orderId ?? null,
          kind: alarm.kind,
        },
      },
    ],
  });
}
