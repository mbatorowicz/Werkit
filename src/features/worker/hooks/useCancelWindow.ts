"use client";

import { useState, useEffect } from "react";

type UseCancelWindowParams = {
  session: { id: number; startTime: string } | null;
  cancelWindowMinutes: number | undefined;
};

/**
 * Hook zarządzający logiką okna anulowania sesji.
 * Zegar aktualizuje się co 30 sekund bez Date.now() w renderze (React 19 / purity).
 */
export function useCancelWindow({ session, cancelWindowMinutes }: UseCancelWindowParams) {
  const [cancelWindowClock, setCancelWindowClock] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setCancelWindowClock(Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [session?.id, session?.startTime]);

  const isCancelWindowOpen =
    session && cancelWindowMinutes
      ? (cancelWindowClock - new Date(session.startTime).getTime()) / 60000 <= cancelWindowMinutes
      : true;

  return { isCancelWindowOpen };
}
