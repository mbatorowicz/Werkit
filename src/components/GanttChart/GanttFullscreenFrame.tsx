"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { overlayHistoryState, isOverlayHistoryState } from "@/lib/overlayHistory";
import { SURFACE_CARD } from "@/lib/uiTokens";
import { cn } from "@/lib/cn";

const OVERLAY_ID = "gantt";

type Props = {
  open: boolean;
  onClose: () => void;
  showRotateHint: boolean;
  rotateHint: string;
  children: ReactNode;
};

/**
 * Pełnoekranowa ramka Gantta (`z-[80]` — poniżej modali `z-[100]`).
 * Escape i `history.back()` (Android) zamykają overlay bez wychodzenia z `/admin`.
 */
export function GanttFullscreenFrame({
  open,
  onClose,
  showRotateHint,
  rotateHint,
  children,
}: Props) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.history.pushState(overlayHistoryState(OVERLAY_ID), "");
    let closedByPop = false;

    const onPopState = () => {
      closedByPop = true;
      onCloseRef.current();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
      if (!closedByPop && isOverlayHistoryState(window.history.state)) {
        window.history.back();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex h-[100dvh] max-h-[100dvh] flex-col",
        SURFACE_CARD
      )}
      role="dialog"
      aria-modal="true"
    >
      {showRotateHint ? (
        <p className="shrink-0 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
          {rotateHint}
        </p>
      ) : null}
      {children}
    </div>
  );
}
