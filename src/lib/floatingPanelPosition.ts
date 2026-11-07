export const FLOATING_PANEL_MAX_HEIGHT = 224;
export const FLOATING_PANEL_GAP = 4;
export const FLOATING_PANEL_VIEWPORT_MARGIN = 8;
export const FLOATING_PANEL_MIN_HEIGHT = 80;
/** Poniżej tej wysokości w dół panel otwiera się w górę (jeśli jest więcej miejsca nad polem). */
export const FLOATING_PANEL_FLIP_THRESHOLD = 140;

export type FloatingPanelStyle = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

export function getViewportHeight(): number {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.height ?? window.innerHeight;
}

export function computeFloatingPanelStyle(rect: DOMRect): FloatingPanelStyle {
  const viewportHeight = getViewportHeight();
  const viewportTop = typeof window === "undefined" ? 0 : (window.visualViewport?.offsetTop ?? 0);
  const spaceBelow = viewportTop + viewportHeight - rect.bottom - FLOATING_PANEL_VIEWPORT_MARGIN;
  const spaceAbove = rect.top - viewportTop - FLOATING_PANEL_VIEWPORT_MARGIN;
  const openUpward = spaceBelow < FLOATING_PANEL_FLIP_THRESHOLD && spaceAbove > spaceBelow;

  if (openUpward) {
    return {
      // Fixed positioning uses the layout viewport, even when the keyboard
      // shrinks and pans the visual viewport on mobile.
      bottom:
        (typeof window === "undefined" ? viewportHeight : window.innerHeight) -
        rect.top +
        FLOATING_PANEL_GAP,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(
        FLOATING_PANEL_MAX_HEIGHT,
        Math.max(spaceAbove - FLOATING_PANEL_GAP, FLOATING_PANEL_MIN_HEIGHT)
      ),
    };
  }

  return {
    top: rect.bottom + FLOATING_PANEL_GAP,
    left: rect.left,
    width: rect.width,
    maxHeight: Math.min(
      FLOATING_PANEL_MAX_HEIGHT,
      Math.max(spaceBelow - FLOATING_PANEL_GAP, FLOATING_PANEL_MIN_HEIGHT)
    ),
  };
}
