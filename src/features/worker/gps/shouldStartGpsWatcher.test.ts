import { describe, expect, it } from "vitest";
import { shouldStartGpsWatcher } from "@/features/worker/gps/shouldStartGpsWatcher";

const session = { gpsPolicy: "track" as const };

describe("shouldStartGpsWatcher", () => {
  it("startuje przy aktywnej sesji terenowej i fladze włączonej / nieustawionej", () => {
    expect(shouldStartGpsWatcher(session, true)).toBe(true);
    expect(shouldStartGpsWatcher(session, undefined)).toBe(true);
  });

  it("nie startuje bez sesji, przy fladze off ani przy gpsPolicy stationary", () => {
    expect(shouldStartGpsWatcher(null, true)).toBe(false);
    expect(shouldStartGpsWatcher(session, false)).toBe(false);
    expect(shouldStartGpsWatcher({ gpsPolicy: "stationary" }, true)).toBe(false);
  });
});
