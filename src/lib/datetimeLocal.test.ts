import { describe, expect, it } from "vitest";
import {
  DATETIME_LOCAL_STEP_MINUTES,
  DATETIME_LOCAL_TIME_OPTIONS,
  joinDatetimeLocal,
  snapDatetimeLocalValue,
  snapTimeToAllowedSlot,
  splitDatetimeLocal,
} from "./datetimeLocal";

describe("datetimeLocal", () => {
  it("generuje sloty co 10 minut przez całą dobę", () => {
    expect(DATETIME_LOCAL_TIME_OPTIONS.length).toBe((24 * 60) / DATETIME_LOCAL_STEP_MINUTES);
    expect(DATETIME_LOCAL_TIME_OPTIONS[0]).toBe("00:00");
    expect(DATETIME_LOCAL_TIME_OPTIONS[1]).toBe("00:10");
    expect(DATETIME_LOCAL_TIME_OPTIONS.at(-1)).toBe("23:50");
    expect(DATETIME_LOCAL_TIME_OPTIONS).not.toContain("14:26");
  });

  it("snapTimeToAllowedSlot mapuje legacy minuty na slot", () => {
    expect(snapTimeToAllowedSlot("14:26")).toBe("14:30");
    expect(snapTimeToAllowedSlot("14:23")).toBe("14:20");
    expect(snapTimeToAllowedSlot("14:30")).toBe("14:30");
  });

  it("join i split zachowują dozwolony slot", () => {
    expect(joinDatetimeLocal("2026-06-03", "14:30")).toBe("2026-06-03T14:30");
    expect(splitDatetimeLocal("2026-06-03T14:30")).toEqual({
      date: "2026-06-03",
      time: "14:30",
    });
  });

  it("snapDatetimeLocalValue normalizuje pełną wartość", () => {
    expect(snapDatetimeLocalValue("2026-06-03T14:26")).toBe("2026-06-03T14:30");
    expect(snapDatetimeLocalValue("")).toBe("");
  });
});
