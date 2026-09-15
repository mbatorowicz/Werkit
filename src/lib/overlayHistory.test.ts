import { describe, expect, it } from "vitest";
import {
  isOverlayHistoryState,
  overlayHistoryState,
  OVERLAY_HISTORY_KEY,
} from "@/lib/overlayHistory";

describe("overlayHistory", () => {
  it("buduje marker overlayu", () => {
    expect(overlayHistoryState("gantt")).toEqual({ [OVERLAY_HISTORY_KEY]: "gantt" });
  });

  it("rozpoznaje stan historii overlayu", () => {
    expect(isOverlayHistoryState({ [OVERLAY_HISTORY_KEY]: "gantt" })).toBe(true);
    expect(isOverlayHistoryState({ other: "gantt" })).toBe(false);
    expect(isOverlayHistoryState(null)).toBe(false);
    expect(isOverlayHistoryState("gantt")).toBe(false);
  });
});
