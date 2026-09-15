import type { AppDictionary } from "@/i18n/types";
import type { AppSettings, Session, WorkOrder } from "@/types/worker";
import {
  buildOverdueOrderAlarm,
  buildTimeOverrunAlarm,
  buildUpcomingOrderAlarm,
  type WorkerActiveAlarm,
} from "@/features/worker/lib/workerAlarmTypes";
import { getSnoozeUntil, isDismissed } from "@/features/worker/lib/workerAlarmSnooze";

type AlarmDict = AppDictionary["worker"]["alarms"];

export type PlannedNativeAlarm = {
  alarm: WorkerActiveAlarm;
  atMs: number;
};

const MIN_FUTURE_MS = 2_000;

export function planNativeWorkerAlarms(args: {
  nowMs: number;
  session: Session | null;
  workOrders: WorkOrder[];
  settings: AppSettings | null;
  notificationsEnabled: boolean;
  dict: AlarmDict;
}): PlannedNativeAlarm[] {
  if (!args.notificationsEnabled) return [];

  const out: PlannedNativeAlarm[] = [];
  const { nowMs, dict } = args;

  const pushIfFuture = (alarm: WorkerActiveAlarm, atMs: number) => {
    if (isDismissed(alarm.alarmKey)) return;
    const snoozeUntil = getSnoozeUntil(alarm.alarmKey);
    const fireAt = typeof snoozeUntil === "number" && snoozeUntil > nowMs ? snoozeUntil : atMs;
    if (!Number.isFinite(fireAt) || fireAt <= nowMs + MIN_FUTURE_MS) return;
    out.push({ alarm, atMs: fireAt });
  };

  if (args.session?.expectedDurationHours && args.settings?.timeOverrunReminder) {
    const hours = parseFloat(String(args.session.expectedDurationHours));
    if (Number.isFinite(hours) && hours > 0) {
      const fireAt = new Date(args.session.startTime).getTime() + hours * 3_600_000;
      pushIfFuture(buildTimeOverrunAlarm(dict, args.session, nowMs), fireAt);
    }
  }

  const reminderMs = (args.settings?.upcomingOrderReminderMinutes ?? 120) * 60 * 1000;

  for (const order of args.workOrders) {
    if (!order.dueDate) continue;
    const dueMs = new Date(order.dueDate).getTime();
    if (!Number.isFinite(dueMs)) continue;

    if (dueMs > nowMs) {
      pushIfFuture(buildUpcomingOrderAlarm(dict, order, nowMs), dueMs - reminderMs);
    }
    pushIfFuture(buildOverdueOrderAlarm(dict, order, nowMs), dueMs);
  }

  return out;
}
