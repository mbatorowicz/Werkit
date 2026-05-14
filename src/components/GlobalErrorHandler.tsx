"use client";

import { useEffect } from "react";
import { sendRemoteLog } from "@/lib/remoteLogger";

export function GlobalErrorHandler() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      sendRemoteLog("ERROR", "Nieobsłużony wyjątek (window.onerror)", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack || event.error
      }, { category: "errors" });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      sendRemoteLog("ERROR", "Nieobsłużona obietnica (unhandledrejection)", {
        reason: event.reason?.stack || event.reason || "Brak szczegółów",
      }, { category: "errors" });
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
