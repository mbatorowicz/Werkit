import { describe, expect, it } from "vitest";
import { shouldStartGpsWatcher } from "@/features/worker/gps/shouldStartGpsWatcher";
import type { Session } from "@/types/worker";

const session: Session = {
  id: 1,
  startTime: "2026-01-01T08:00:00.000Z",
  categoryId: 1,
  categoryName: "Transport",
  status: "IN_PROGRESS",
  categoryIsStationary: false,
};

describe("shouldStartGpsWatcher", () => {
  it("startuje przy aktywnej sesji terenowej i fladze włączonej / nieustawionej", () => {
    expect(shouldStartGpsWatcher(session, true)).toBe(true);
    expect(shouldStartGpsWatcher(session, undefined)).toBe(true);
  });

  it("nie startuje bez sesji, przy fladze off ani przy kategorii stacjonarnej", () => {
    expect(shouldStartGpsWatcher(null, true)).toBe(false);
    expect(shouldStartGpsWatcher(session, false)).toBe(false);
    expect(shouldStartGpsWatcher({ ...session, categoryIsStationary: true }, true)).toBe(false);
  });
});
