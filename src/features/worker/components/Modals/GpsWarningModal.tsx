"use client";

import { Navigation } from "lucide-react";
import { backgroundGeolocation } from "@/features/worker/gps/backgroundGeolocationSingleton";
import type { AppDictionary } from "@/i18n/types";

type WorkerClientDict = AppDictionary["worker"]["client"];

interface GpsWarningModalProps {
  showGpsWarning: boolean;
  setShowGpsWarning: (val: boolean) => void;
  pendingOrderId: number | null;
  setPendingOrderId: (id: number | null) => void;
  handleAcceptOrder: (orderId: number) => void;
  dict: WorkerClientDict;
}

export default function GpsWarningModal({
  showGpsWarning,
  setShowGpsWarning,
  pendingOrderId,
  setPendingOrderId,
  handleAcceptOrder,
  dict,
}: GpsWarningModalProps) {
  if (!showGpsWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGpsWarning(false)}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
        <div className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
          <Navigation className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-center text-zinc-900 dark:text-white mb-2">{dict.gpsAlwaysPermissionTitle}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-6">
          {dict.gpsAlwaysPermissionLead}
          <strong className="text-zinc-900 dark:text-white">{dict.gpsAlwaysPermissionEmphasis}</strong>
          {dict.gpsAlwaysPermissionTail}
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={async () => {
              if (typeof backgroundGeolocation.openSettings === "function") {
                await backgroundGeolocation.openSettings();
              }
            }}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white rounded-lg py-3 font-bold text-sm transition-all"
          >
            {dict.gpsOpenPhoneSettings}
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("werkit_bg_loc_verified", "true");
              setShowGpsWarning(false);
              if (pendingOrderId !== null) {
                handleAcceptOrder(pendingOrderId);
                setPendingOrderId(null);
              }
            }}
            className="w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-3 font-bold text-sm transition-all"
          >
            {dict.gpsUnderstandAlwaysSet}
          </button>
        </div>
      </div>
    </div>
  );
}
