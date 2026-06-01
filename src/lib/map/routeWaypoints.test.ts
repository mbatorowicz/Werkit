import { describe, expect, it } from "vitest";
import { parseRouteWaypoints, serializeRouteWaypoints } from "@/lib/map/routeWaypoints";

describe("parseRouteWaypoints", () => {
  it("zwraca pustą tablicę dla nie-tablicy", () => {
    expect(parseRouteWaypoints(null)).toEqual([]);
    expect(parseRouteWaypoints({ lat: 1, lng: 2 })).toEqual([]);
  });

  it("parsuje poprawne punkty i pomija śmieci", () => {
    expect(
      parseRouteWaypoints([
        { lat: 52.1, lng: 21.0 },
        { lat: "52.2", lng: "21.1" },
        { lat: "x", lng: 1 },
        null,
      ])
    ).toEqual([
      { lat: 52.1, lng: 21 },
      { lat: 52.2, lng: 21.1 },
    ]);
  });
});

describe("serializeRouteWaypoints", () => {
  it("kopiuje współrzędne bez mutacji wejścia", () => {
    const input = [{ lat: 50, lng: 19 }];
    const out = serializeRouteWaypoints(input);
    expect(out).toEqual([{ lat: 50, lng: 19 }]);
    expect(out).not.toBe(input);
  });
});
