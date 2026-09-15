"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { AppDictionary } from "@/i18n/types";
import { sendRemoteLog } from "@/lib/remoteLogger";
import type { AppSettings, Session, WorkOrder } from "@/types/worker";
import { planNativeWorkerAlarms } from "@/features/worker/lib/planNativeWorkerAlarms";
import { syncNativeWorkerAlarms } from "@/features/worker/lib/scheduleWorkerAlarmNotification";

type AlarmDict = AppDictionary["worker"]["alarms"];

/** Harmonogramuje LocalNotifications na dueDate / reminder / overrun — działa przy zgaszonym ekranie. */
export function useNativeWorkerAlarmSchedule(
  session: Session | null,
  workOrders: WorkOrder[],
  settings: AppSettings | null,
  notificationsEnabled: boolean,
  alarmsDict: AlarmDict,
  alarmSuppressVersion: number
): void {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !notificationsEnabled) return;
    const orders = Array.isArray(workOrders) ? workOrders : [];
    const planned = planNativeWorkerAlarms({
      nowMs: Date.now(),
      session,
      workOrders: orders,
      settings,
      notificationsEnabled,
      dict: alarmsDict,
    });
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          if (typeof LocalNotifications.requestPermissions === "function") {
            const perm = await LocalNotifications.requestPermissions();
            if (perm.display !== "granted" || cancelled) return;
          }
          if (cancelled) return;
          await syncNativeWorkerAlarms(planned, alarmsDict);
        } catch (e: unknown) {
          sendRemoteLog(
            "ERROR",
            "Błąd sync NativeWorkerAlarms",
            { error: e instanceof Error ? e.message : String(e) },
            { category: "notifications" }
          );
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [session, workOrders, settings, notificationsEnabled, alarmsDict, alarmSuppressVersion]);
}
