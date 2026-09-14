import { describe, expect, it } from "vitest";
import { narrowAppSettings } from "@/features/worker/lib/narrowWorkerClientPayload";

describe("narrowAppSettings", () => {
  it("zwraca null dla nie-obiektu", () => {
    expect(narrowAppSettings(null)).toBeNull();
    expect(narrowAppSettings("x")).toBeNull();
    expect(narrowAppSettings(1)).toBeNull();
  });

  it("przepuszcza gpsTrackingEnabled i durEnabled", () => {
    expect(
      narrowAppSettings({
        gpsTrackingEnabled: false,
        durEnabled: true,
        requirePhotoToFinish: true,
      })
    ).toEqual({
      gpsTrackingEnabled: false,
      durEnabled: true,
      requirePhotoToFinish: true,
    });
  });

  it("pomija gpsTrackingEnabled gdy nie jest booleanem", () => {
    expect(narrowAppSettings({ gpsTrackingEnabled: "false", geofenceRadiusMeters: 200 })).toEqual({
      geofenceRadiusMeters: 200,
    });
  });

  it("nie kopiuje nieznanych pól (np. companyName)", () => {
    const s = narrowAppSettings({ companyName: "X", gpsTrackingEnabled: true });
    expect(s).toEqual({ gpsTrackingEnabled: true });
    expect(s).not.toHaveProperty("companyName");
  });
});
