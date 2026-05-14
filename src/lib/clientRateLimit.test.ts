import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("clientRateLimit (przez publiczne API, izolacja modułu)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dedupe: drugi wpis z tym samym kluczem w oknie jest pomijany", async () => {
    const { shouldSkipClientLogDedupe } = await import("@/lib/clientRateLimit");
    expect(shouldSkipClientLogDedupe("k1", 1000)).toBe(false);
    expect(shouldSkipClientLogDedupe("k1", 1000)).toBe(true);
    vi.advanceTimersByTime(1001);
    expect(shouldSkipClientLogDedupe("k1", 1000)).toBe(false);
  });

  it("throttle: nie koliduje z dedupe (osobna mapa)", async () => {
    const { shouldSkipClientLogDedupe, shouldThrottleTelemetryLog } = await import("@/lib/clientRateLimit");
    expect(shouldSkipClientLogDedupe("shared-key", 5000)).toBe(false);
    expect(shouldThrottleTelemetryLog("shared-key", 5000)).toBe(false);
    expect(shouldThrottleTelemetryLog("shared-key", 5000)).toBe(true);
    expect(shouldSkipClientLogDedupe("shared-key", 5000)).toBe(true);
  });
});
