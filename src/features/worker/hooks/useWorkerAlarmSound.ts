"use client";

import { useEffect } from "react";
import type { WorkerActiveAlarm } from "@/features/worker/lib/workerAlarmTypes";
import { startAlarmSoundLoop, stopAlarmSound } from "@/features/worker/lib/workerAlarmSoundPlayer";

/** Odtwarza dźwięk alarmu w aplikacji (PWA + foreground na natywnym) dopóki modal alarmu jest aktywny. */
export function useWorkerAlarmSound(activeAlarm: WorkerActiveAlarm | null): void {
  useEffect(() => {
    if (!activeAlarm) {
      stopAlarmSound();
      return;
    }
    startAlarmSoundLoop(activeAlarm.kind);
    return () => stopAlarmSound();
  }, [activeAlarm]);
}
