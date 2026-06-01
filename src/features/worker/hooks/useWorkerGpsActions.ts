"use client";

import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { getCurrentPositionOnce } from "@/lib/geolocationOnce";

type UseWorkerGpsActionsParams = {
  location: { lat: number; lng: number } | null;
  submitAcceptOrder: (orderId: number, startLoc: { lat: number; lng: number }) => Promise<void>;
  submitEndSession: (endLoc: { lat: number; lng: number }) => Promise<void>;
  setPendingOrderId: (orderId: number | null) => void;
  setShowGpsWarning: (show: boolean) => void;
};

/**
 * Hook zarządzający akcjami wymagającymi lokalizacji GPS.
 * Obsługuje weryfikację uprawnień na platformach natywnych (Capacitor).
 */
export function useWorkerGpsActions({
  location,
  submitAcceptOrder,
  submitEndSession,
  setPendingOrderId,
  setShowGpsWarning,
}: UseWorkerGpsActionsParams) {
  const requestAcceptOrder = useCallback(
    (orderId: number) => {
      if (Capacitor.isNativePlatform()) {
        const verified = localStorage.getItem("werkit_bg_loc_verified");
        if (verified !== "true") {
          setPendingOrderId(orderId);
          setShowGpsWarning(true);
          return;
        }
      }
      void (async () => {
        const startLoc = location ?? (await getCurrentPositionOnce());
        if (startLoc) {
          await submitAcceptOrder(orderId, startLoc);
        }
      })();
    },
    [location, submitAcceptOrder, setPendingOrderId, setShowGpsWarning]
  );

  const handleEndSession = useCallback(() => {
    void (async () => {
      const endLoc = location ?? (await getCurrentPositionOnce());
      if (endLoc) {
        await submitEndSession(endLoc);
      }
    })();
  }, [location, submitEndSession]);

  const handleAcceptOrderFromModal = useCallback(
    (orderId: number) => {
      void (async () => {
        const startLoc = location ?? (await getCurrentPositionOnce());
        if (startLoc) {
          await submitAcceptOrder(orderId, startLoc);
        }
      })();
    },
    [location, submitAcceptOrder]
  );

  return {
    requestAcceptOrder,
    handleEndSession,
    handleAcceptOrderFromModal,
  };
}
