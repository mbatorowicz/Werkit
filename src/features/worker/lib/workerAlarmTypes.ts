import { formatDict } from "@/i18n/format";
import type { AppDictionary } from "@/i18n/types";
import type { Session, WorkOrder } from "@/types/worker";
import { getSnoozeOptions, minutesUntilDue } from "@/features/worker/lib/workerAlarmSnooze";

export type WorkerAlarmKind = "time_overrun" | "order_overdue" | "order_upcoming";

export type WorkerActiveAlarm = {
  alarmKey: string;
  notificationId: number;
  kind: WorkerAlarmKind;
  title: string;
  body: string;
  orderId?: number;
  snoozeOptions: number[];
  canStart: boolean;
};

type AlarmDict = AppDictionary["worker"]["alarms"];

export function buildTimeOverrunAlarm(
  dict: AlarmDict,
  session: Session,
  nowMs: number,
): WorkerActiveAlarm {
  const remaining = session.expectedDurationHours
    ? Math.max(
        1,
        Math.ceil(
          parseFloat(String(session.expectedDurationHours)) * 60 -
            (nowMs - new Date(session.startTime).getTime()) / 60_000,
        ),
      )
    : null;
  const snoozeOptions = getSnoozeOptions(remaining);
  return {
    alarmKey: "time_overrun",
    notificationId: 999991,
    kind: "time_overrun",
    title: dict.timeOverrunTitle,
    body: dict.timeOverrunBody,
    snoozeOptions,
    canStart: false,
  };
}

export function buildOverdueOrderAlarm(
  dict: AlarmDict,
  order: WorkOrder,
  nowMs: number,
): WorkerActiveAlarm {
  const remaining = minutesUntilDue(order.dueDate, nowMs);
  return {
    alarmKey: `order_overdue_${order.id}`,
    notificationId: order.id + 100_000,
    kind: "order_overdue",
    title: dict.orderOverdueTitle,
    body: formatDict(dict.orderOverdueBody, {
      label: order.customerName || order.resourceName || `#${order.id}`,
    }),
    orderId: order.id,
    snoozeOptions: getSnoozeOptions(remaining),
    canStart: true,
  };
}

export function buildUpcomingOrderAlarm(
  dict: AlarmDict,
  order: WorkOrder,
  nowMs: number,
): WorkerActiveAlarm {
  const remaining = minutesUntilDue(order.dueDate, nowMs);
  return {
    alarmKey: `order_upcoming_${order.id}`,
    notificationId: order.id + 200_000,
    kind: "order_upcoming",
    title: dict.orderUpcomingTitle,
    body: formatDict(dict.orderUpcomingBody, {
      label: order.customerName || order.resourceName || `#${order.id}`,
    }),
    orderId: order.id,
    snoozeOptions: getSnoozeOptions(remaining),
    canStart: true,
  };
}
