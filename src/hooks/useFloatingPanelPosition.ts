"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { computeFloatingPanelStyle, type FloatingPanelStyle } from "@/lib/floatingPanelPosition";

export function useFloatingPanelPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean
): FloatingPanelStyle | null {
  const [style, setStyle] = useState<FloatingPanelStyle | null>(null);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setStyle(computeFloatingPanelStyle(el.getBoundingClientRect()));
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", onScrollOrResize);
    viewport?.addEventListener("scroll", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      viewport?.removeEventListener("resize", onScrollOrResize);
      viewport?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [open, updatePosition]);

  return open ? style : null;
}
