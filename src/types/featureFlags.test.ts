import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  gpsModuleFlagsPatch,
  isGpsModuleEnabled,
} from "@/types/featureFlags";

describe("featureFlags GPS module", () => {
  it("isGpsModuleEnabled is true only when all GPS flags are on", () => {
    expect(isGpsModuleEnabled(DEFAULT_FEATURE_FLAGS)).toBe(true);
    expect(
      isGpsModuleEnabled({
        ...DEFAULT_FEATURE_FLAGS,
        mapViewEnabled: false,
      })
    ).toBe(false);
  });

  it("gpsModuleFlagsPatch sets all five GPS keys", () => {
    expect(gpsModuleFlagsPatch(false)).toEqual({
      gpsTrackingEnabled: false,
      mapViewEnabled: false,
      geofencingEnabled: false,
      routePlanningEnabled: false,
      navigationEnabled: false,
    });
    expect(gpsModuleFlagsPatch(true)).toEqual({
      gpsTrackingEnabled: true,
      mapViewEnabled: true,
      geofencingEnabled: true,
      routePlanningEnabled: true,
      navigationEnabled: true,
    });
  });
});
