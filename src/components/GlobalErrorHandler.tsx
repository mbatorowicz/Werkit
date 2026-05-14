"use client";

import { useEffect } from "react";
import { sendRemoteLog } from "@/lib/remoteLogger";

function rejectionDedupeExtra(reason: unknown): string {
  if (reason instanceof Error) {
    return `${reason.name}|${reason.message}|${reason.stack?.slice(0, 200) ?? ""}`;
  }
  if (reason && typeof reason === "object" && "stack" in reason && typeof (reason as { stack: unknown }).stack === "string") {
    return (reason as { stack: string }).stack.slice(0, 280);
  }
  return String(reason).slice(0, 280);
}

export function GlobalErrorHandler() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      if (msg.includes("ResizeObserver loop")) return;
      const stackHead =
        event.error instanceof Error
          ? event.error.stack?.slice(0, 200) ?? event.error.message
          : typeof event.error === "string"
            ? event.error.slice(0, 200)
            : "";
      const dedupeKeyExtra = `${msg}|${event.filename ?? ""}|${event.lineno}|${event.colno}|${stackHead}`;
      sendRemoteLog(
        "ERROR",
        "Nieobsłużony wyjątek (window.onerror)",
        {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack || event.error,
        },
        { category: "errors", dedupeWindowMs: 15_000, dedupeKeyExtra },
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const extra = rejectionDedupeExtra(event.reason);
      sendRemoteLog(
        "ERROR",
        "Nieobsłużona obietnica (unhandledrejection)",
        {
          reason: event.reason?.stack || event.reason || "Brak szczegółów",
        },
        { category: "errors", dedupeWindowMs: 15_000, dedupeKeyExtra: extra },
      );
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
