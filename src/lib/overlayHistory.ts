import { isRecord } from "@/lib/narrow";

/** Marker `history.state` dla overlayu (Gantt pełny ekran itd.). */
export const OVERLAY_HISTORY_KEY = "werkitOverlay";

export function overlayHistoryState(id: string): Record<string, string> {
  return { [OVERLAY_HISTORY_KEY]: id };
}

export function isOverlayHistoryState(state: unknown): boolean {
  return isRecord(state) && typeof state[OVERLAY_HISTORY_KEY] === "string";
}
