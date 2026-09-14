import { describe, expect, it } from "vitest";
import { shouldAbandonGpsQueue } from "@/lib/gpsFlushPolicy";

describe("shouldAbandonGpsQueue", () => {
  it("porzuca kolejkę przy HTTP 403", () => {
    expect(shouldAbandonGpsQueue(403)).toBe(true);
    expect(shouldAbandonGpsQueue(403, "feature_disabled")).toBe(true);
  });

  it("porzuca kolejkę przy feature_disabled niezależnie od statusu", () => {
    expect(shouldAbandonGpsQueue(400, "feature_disabled")).toBe(true);
  });

  it("nie porzuca kolejki przy zwykłych błędach", () => {
    expect(shouldAbandonGpsQueue(400, "no_active_session")).toBe(false);
    expect(shouldAbandonGpsQueue(500)).toBe(false);
    expect(shouldAbandonGpsQueue(200)).toBe(false);
  });
});
