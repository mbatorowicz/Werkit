"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { getDictionary } from "@/i18n";
import { sendRemoteLog } from "@/lib/remoteLogger";
import type { Session, WorkOrder, AppSettings, UserData } from "@/types/worker";
import {
  buildOverdueOrderAlarm,
  buildTimeOverrunAlarm,
  buildUpcomingOrderAlarm,
  type WorkerActiveAlarm,
} from "@/features/worker/lib/workerAlarmTypes";
import {
  canFireAlarm,
  clearDismissed,
  dismissAlarm,
  migrateLegacyNotifiedOrders,
  setSnooze,
} from "@/features/worker/lib/workerAlarmSnooze";
import { scheduleWorkerAlarmNotification } from "@/features/worker/lib/scheduleWorkerAlarmNotification";

function pickActiveAlarm(
  isTimeOverrun: boolean,
  session: Session | null,
  overdueOrder: WorkOrder | undefined,
  upcomingOrder: WorkOrder | undefined,
  nowMs: number,
): WorkerActiveAlarm | null {
  const alarmsDict = getDictionary().worker.alarms;
  if (isTimeOverrun && session) {
    return buildTimeOverrunAlarm(alarmsDict, session, nowMs);
  }
  if (overdueOrder) {
    return buildOverdueOrderAlarm(alarmsDict, overdueOrder, nowMs);
  }
  if (upcomingOrder) {
    return buildUpcomingOrderAlarm(alarmsDict, upcomingOrder, nowMs);
  }
  return null;
}

export function useWorkerNotifications(
  session: Session | null,
  workOrders: WorkOrder[],
  settings: AppSettings | null,
  currentUser: UserData | null,
) {
  const [alarmClock, setAlarmClock] = useState(() => Date.now());
  const [alarmSuppressVersion, setAlarmSuppressVersion] = useState(0);
  const lastNativeScheduledRef = useRef<Record<string, number>>({});

  useEffect(() => {
    migrateLegacyNotifiedOrders();
    const tick = () => setAlarmClock(Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const notificationsEnabled = currentUser?.notificationsEnabled !== false;

  const isTimeOverrun = useMemo(() => {
    if (!session?.expectedDurationHours || !settings?.timeOverrunReminder) return false;
    const elapsedH =
      (alarmClock - new Date(session.startTime).getTime()) / 3_600_000;
    return elapsedH > parseFloat(String(session.expectedDurationHours));
  }, [session, settings?.timeOverrunReminder, alarmClock]);

  const overdueOrder = useMemo(
    () =>
      workOrders.find((order) => {
        if (!order.dueDate) return false;
        return new Date(order.dueDate).getTime() < alarmClock;
      }),
    [workOrders, alarmClock],
  );

  const upcomingOrder = useMemo(
    () =>
      workOrders.find((order) => {
        if (!order.dueDate) return false;
        const dueTime = new Date(order.dueDate).getTime();
        const reminderMs = (settings?.upcomingOrderReminderMinutes ?? 120) * 60 * 1000;
        return dueTime > alarmClock && dueTime - alarmClock < reminderMs;
      }),
    [workOrders, settings?.upcomingOrderReminderMinutes, alarmClock],
  );

  const candidateAlarm = useMemo(
    () => pickActiveAlarm(isTimeOverrun, session, overdueOrder, upcomingOrder, alarmClock),
    [isTimeOverrun, session, overdueOrder, upcomingOrder, alarmClock],
  );

  const activeAlarm = useMemo(() => {
    void alarmSuppressVersion;
    if (!notificationsEnabled || !candidateAlarm) return null;
    if (!canFireAlarm(candidateAlarm.alarmKey, alarmClock)) return null;
    return candidateAlarm;
  }, [notificationsEnabled, candidateAlarm, alarmClock, alarmSuppressVersion]);

  const scheduleNativeIfNeeded = useCallback(
    async (alarm: WorkerActiveAlarm) => {
      if (!Capacitor.isNativePlatform()) return;
      const lastNative = lastNativeScheduledRef.current[alarm.alarmKey];
      const nativeDebounceMs = 55_000;
      if (lastNative != null && alarmClock - lastNative < nativeDebounceMs) return;

      try {
        let hasPermission = false;
        if (LocalNotifications && typeof LocalNotifications.requestPermissions === "function") {
          const perm = await LocalNotifications.requestPermissions();
          hasPermission = perm.display === "granted";
        }
        if (!hasPermission) {
          sendRemoteLog(
            "WARN",
            "Brak uprawnień do LocalNotifications",
            { alarmKey: alarm.alarmKey },
            { category: "notifications" },
          );
          return;
        }
        await scheduleWorkerAlarmNotification(alarm, getDictionary().worker.alarms);
        lastNativeScheduledRef.current[alarm.alarmKey] = alarmClock;
      } catch (e: unknown) {
        sendRemoteLog(
          "ERROR",
          "Błąd podczas LocalNotifications.schedule",
          { error: e instanceof Error ? e.message : String(e), alarmKey: alarm.alarmKey },
          { category: "notifications" },
        );
      }
    },
    [alarmClock],
  );

  useEffect(() => {
    if (!activeAlarm) return;
    queueMicrotask(() => {
      void scheduleNativeIfNeeded(activeAlarm);
    });
  }, [activeAlarm, scheduleNativeIfNeeded]);

  useEffect(() => {
    if (!isTimeOverrun) clearDismissed("time_overrun");
  }, [isTimeOverrun]);

  useEffect(() => {
    const id = overdueOrder?.id;
    if (id == null) return;
    const key = `order_overdue_${id}`;
    return () => clearDismissed(key);
  }, [overdueOrder?.id]);

  useEffect(() => {
    const id = upcomingOrder?.id;
    if (id == null) return;
    const key = `order_upcoming_${id}`;
    return () => clearDismissed(key);
  }, [upcomingOrder?.id]);

  const refreshAlarmUi = useCallback(() => {
    setAlarmSuppressVersion((v) => v + 1);
  }, []);

  const dismissActiveAlarm = useCallback(() => {
    if (!activeAlarm) return;
    dismissAlarm(activeAlarm.alarmKey);
    delete lastNativeScheduledRef.current[activeAlarm.alarmKey];
    refreshAlarmUi();
  }, [activeAlarm, refreshAlarmUi]);

  const snoozeActiveAlarm = useCallback(
    (minutes: number) => {
      if (!activeAlarm) return;
      setSnooze(activeAlarm.alarmKey, minutes);
      delete lastNativeScheduledRef.current[activeAlarm.alarmKey];
      refreshAlarmUi();
    },
    [activeAlarm, refreshAlarmUi],
  );

  return {
    isTimeOverrun,
    overdueOrder,
    upcomingOrder,
    activeAlarm,
    dismissActiveAlarm,
    snoozeActiveAlarm,
    refreshAlarmUi,
  };
}
