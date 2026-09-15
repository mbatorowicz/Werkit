import { describe, expect, it } from "vitest";
import {
  coordFromAccuracySample,
  coordFromGeolocationCoords,
  gpsRejectLogMeta,
} from "@/features/worker/gps/coordFromNativeReading";

describe("coordFromAccuracySample", () => {
  it("przyjmuje punkt z dokładnością 40 m", () => {
    expect(
      coordFromAccuracySample({ latitude: 52.2, longitude: 21.0, accuracy: 40, heading: 90 })
    ).toEqual({ lat: 52.2, lng: 21.0, heading: 90 });
  });

  it("odrzuca szpilkę powyżej 40 m", () => {
    expect(
      coordFromAccuracySample({ latitude: 52.2, longitude: 21.0, accuracy: 40.1 })
    ).toBeNull();
  });

  it("przyjmuje odczyt bez accuracy (web bez pola)", () => {
    expect(coordFromAccuracySample({ latitude: 1, longitude: 2 })).toEqual({
      lat: 1,
      lng: 2,
      heading: undefined,
    });
  });
});

describe("coordFromGeolocationCoords", () => {
  it("mapuje heading z GeolocationCoordinates", () => {
    expect(
      coordFromGeolocationCoords({
        latitude: 10,
        longitude: 20,
        accuracy: 12,
        heading: 45,
      })
    ).toEqual({ lat: 10, lng: 20, heading: 45 });
  });
});

describe("gpsRejectLogMeta", () => {
  it("loguje tylko zaokrągloną dokładność", () => {
    expect(gpsRejectLogMeta(41.6)).toEqual({ accuracy: 42 });
  });

  it("nie dodaje pustego accuracy", () => {
    expect(gpsRejectLogMeta(undefined)).toEqual({});
  });
});
