"use client";

import { useEffect, useState } from "react";

/** Licznik upływu czasu od `startTime` (format HH:MM:SS). */
export function ActiveSessionSessionTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = now - start;
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setElapsed(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <>{elapsed}</>;
}
