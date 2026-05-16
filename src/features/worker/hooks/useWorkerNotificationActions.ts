"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { dismissAlarm, setSnooze } from "@/features/worker/lib/workerAlarmSnooze";
import type { WorkerAlarmActionHandlers } from "@/features/worker/hooks/useWorkerNotificationActions.types";

export type { WorkerAlarmActionHandlers };

export function useWorkerNotificationActions(handlers: WorkerAlarmActionHandlers): void {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return;
    if (!LocalNotifications || typeof LocalNotifications.addListener !== "function") return;

    const sub = LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        const extra = event.notification?.extra as
          | { alarmKey?: string; orderId?: number | null }
          | undefined;
        const alarmKey =
          typeof extra?.alarmKey === "string"
            ? extra.alarmKey
            : typeof event.notification?.id === "number"
              ? `notification_${event.notification.id}`
              : null;
        if (!alarmKey) return;

        const actionId = event.actionId;
        const h = handlersRef.current;

        if (actionId === "ok") {
          dismissAlarm(alarmKey);
          h.onAlarmDismissed(alarmKey);
          return;
        }

        if (actionId === "start") {
          const orderId = extra?.orderId;
          if (typeof orderId === "number") {
            dismissAlarm(alarmKey);
            h.onStartOrder(orderId);
            h.onAlarmDismissed(alarmKey);
          }
          return;
        }

        if (actionId.startsWith("snooze_")) {
          const minutes = parseInt(actionId.slice("snooze_".length), 10);
          if (Number.isFinite(minutes) && minutes > 0) {
            setSnooze(alarmKey, minutes);
            h.onAlarmDismissed(alarmKey);
          }
        }
      },
    );

    return () => {
      void sub.then((handle) => handle.remove());
    };
  }, []);
}
