import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  canAssignWorkerRouteEdit,
  isAdminGpsEnabled,
  isGpsModuleEnabled,
} from "@/types/featureFlags";

describe("featureFlags GPS module", () => {
  it("isGpsModuleEnabled zależy tylko od gpsTrackingEnabled", () => {
    expect(isGpsModuleEnabled(DEFAULT_FEATURE_FLAGS)).toBe(true);
    expect(
      isGpsModuleEnabled({
        ...DEFAULT_FEATURE_FLAGS,
        geofencingEnabled: false,
        mapViewEnabled: false,
        routePlanningEnabled: false,
        navigationEnabled: false,
      })
    ).toBe(true);
    expect(
      isGpsModuleEnabled({
        ...DEFAULT_FEATURE_FLAGS,
        gpsTrackingEnabled: false,
      })
    ).toBe(false);
  });

  it("isAdminGpsEnabled jest true gdy śledzenie albo mapa", () => {
    expect(
      isAdminGpsEnabled({
        ...DEFAULT_FEATURE_FLAGS,
        gpsTrackingEnabled: false,
        mapViewEnabled: true,
      })
    ).toBe(true);
    expect(
      isAdminGpsEnabled({
        ...DEFAULT_FEATURE_FLAGS,
        gpsTrackingEnabled: true,
        mapViewEnabled: false,
      })
    ).toBe(true);
    expect(
      isAdminGpsEnabled({
        ...DEFAULT_FEATURE_FLAGS,
        gpsTrackingEnabled: false,
        mapViewEnabled: false,
      })
    ).toBe(false);
  });

  it("wyłączenie geofence nie gasi śledzenia ani UI GPS admina", () => {
    const geofenceOff = { ...DEFAULT_FEATURE_FLAGS, geofencingEnabled: false };
    expect(isGpsModuleEnabled(geofenceOff)).toBe(true);
    expect(isAdminGpsEnabled(geofenceOff)).toBe(true);
    expect(canAssignWorkerRouteEdit(geofenceOff)).toBe(true);
  });

  it("canAssignWorkerRouteEdit wymaga mapy i planowania trasy", () => {
    expect(canAssignWorkerRouteEdit(DEFAULT_FEATURE_FLAGS)).toBe(true);
    expect(canAssignWorkerRouteEdit({ ...DEFAULT_FEATURE_FLAGS, mapViewEnabled: false })).toBe(
      false
    );
    expect(
      canAssignWorkerRouteEdit({ ...DEFAULT_FEATURE_FLAGS, routePlanningEnabled: false })
    ).toBe(false);
    expect(
      canAssignWorkerRouteEdit({
        ...DEFAULT_FEATURE_FLAGS,
        gpsTrackingEnabled: false,
        geofencingEnabled: false,
      })
    ).toBe(true);
  });
});
