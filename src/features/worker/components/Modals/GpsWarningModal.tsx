"use client";

import { Navigation } from "lucide-react";
import { backgroundGeolocation } from "@/features/worker/gps/backgroundGeolocationSingleton";
import type { AppDictionary } from "@/i18n/types";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooterActions } from "@/components/FormModalFooter";

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
  const dismiss = () => {
    setShowGpsWarning(false);
    setPendingOrderId(null);
  };

  return (
    <AdminModalShell
      open={showGpsWarning}
      onClose={dismiss}
      title={dict.gpsAlwaysPermissionTitle}
      maxWidthClass="max-w-md"
      titleSize="lg"
      zIndexClass="z-[9999]"
      closeOnBackdropClick={false}
      footer={
        <FormModalFooterActions onCancel={dismiss}>
          <button
            type="button"
            onClick={async () => {
              if (typeof backgroundGeolocation.openSettings === "function") {
                await backgroundGeolocation.openSettings();
              }
            }}
            className="w-full rounded-lg bg-amber-600 py-3 text-sm font-bold text-white transition hover:bg-amber-500"
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
            className="w-full rounded-lg bg-zinc-100 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {dict.gpsUnderstandAlwaysSet}
          </button>
        </FormModalFooterActions>
      }
    >
      <div className="flex flex-col items-center px-6 pb-2 pt-4 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
          <Navigation className="h-8 w-8" />
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {dict.gpsAlwaysPermissionLead}
          <strong className="text-zinc-900 dark:text-white">{dict.gpsAlwaysPermissionEmphasis}</strong>
          {dict.gpsAlwaysPermissionTail}
        </p>
      </div>
    </AdminModalShell>
  );
}
