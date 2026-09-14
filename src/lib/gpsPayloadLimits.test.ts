import { describe, expect, it } from "vitest";
import {
  GPS_MAX_POINTS_PER_REQUEST,
  assertGpsPayloadSize,
  isFiniteGpsCoord,
  normalizeGpsPoints,
} from "@/lib/gpsPayloadLimits";

describe("gpsPayloadLimits", () => {
  const now = new Date("2026-09-14T12:00:00.000Z");

  it("201 punktów → payload_too_large, nic nie normalizuje dalej", () => {
    const points = Array.from({ length: GPS_MAX_POINTS_PER_REQUEST + 1 }, () => ({
      lat: 52,
      lng: 21,
    }));
    expect(() => assertGpsPayloadSize(points)).toThrow("payload_too_large");
    expect(() => assertGpsPayloadSize(points.slice(0, GPS_MAX_POINTS_PER_REQUEST))).not.toThrow();
  });

  it("odrzuca lat poza bbox i nieskończone liczby", () => {
    expect(isFiniteGpsCoord(999, 21)).toBe(false);
    expect(isFiniteGpsCoord(52, 999)).toBe(false);
    expect(isFiniteGpsCoord(Number.NaN, 21)).toBe(false);
    expect(isFiniteGpsCoord(52, Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFiniteGpsCoord(90, 180)).toBe(true);
    expect(isFiniteGpsCoord(-90, -180)).toBe(true);
  });

  it("filtruje lat: 999 i zostawia poprawny punkt", () => {
    const out = normalizeGpsPoints(
      [
        { lat: 52.2297, lng: 21.0122 },
        { lat: 999, lng: 21 },
        { lat: 52.2, lng: Number.NaN },
      ],
      now
    );
    expect(out).toHaveLength(1);
    expect(out[0].lat).toBe(52.2297);
  });

  it("odrzuca timestamp poza oknem −24 h … +5 min", () => {
    const out = normalizeGpsPoints(
      [
        { lat: 52, lng: 21, timestamp: "2026-09-13T11:59:00.000Z" },
        { lat: 52, lng: 21, timestamp: "2026-09-13T12:00:00.000Z" },
        { lat: 52, lng: 21, timestamp: "2026-09-14T12:06:00.000Z" },
        { lat: 52, lng: 21, timestamp: "2026-09-14T12:04:00.000Z" },
        { lat: 52, lng: 21, timestamp: "not-a-date" },
      ],
      now
    );
    expect(out).toHaveLength(2);
    expect(out[0].timestamp.toISOString()).toBe("2026-09-13T12:00:00.000Z");
    expect(out[1].timestamp.toISOString()).toBe("2026-09-14T12:04:00.000Z");
  });
});
