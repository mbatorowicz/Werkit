"use client";

import { useState } from "react";

/** Sterowanie overlayem Gantta bez setState w useEffect (derived + adjust-on-render). */
export function useGanttFullscreen(
  isNarrow: boolean,
  isLandscape: boolean,
  isPortrait: boolean
): {
  fullscreenOpen: boolean;
  openFullscreen: () => void;
  closeFullscreen: () => void;
} {
  const [manualOpen, setManualOpen] = useState(false);
  const [dismissedLandscape, setDismissedLandscape] = useState(false);
  const [prevNarrow, setPrevNarrow] = useState(isNarrow);
  const [prevPortrait, setPrevPortrait] = useState(isPortrait);

  if (isNarrow !== prevNarrow) {
    setPrevNarrow(isNarrow);
    if (!isNarrow) {
      setManualOpen(false);
      setDismissedLandscape(false);
    }
  }
  if (isPortrait !== prevPortrait) {
    setPrevPortrait(isPortrait);
    if (isPortrait) setDismissedLandscape(false);
  }

  return {
    fullscreenOpen: isNarrow && (manualOpen || (isLandscape && !dismissedLandscape)),
    openFullscreen: () => {
      setDismissedLandscape(false);
      setManualOpen(true);
    },
    closeFullscreen: () => {
      setManualOpen(false);
      if (isLandscape) setDismissedLandscape(true);
    },
  };
}
