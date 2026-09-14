import { describe, expect, it } from "vitest";
import { shouldPromptArrivalGeofence } from "@/features/worker/lib/arrivalGeofence";

describe("shouldPromptArrivalGeofence", () => {
  const far = {
    categoryIsStationary: false,
    geofenceRadiusMeters: 500,
    distanceToDestKm: 2,
  };

  it("pyta gdy pracownik jest poza promieniem", () => {
    expect(shouldPromptArrivalGeofence(far)).toBe(true);
  });

  it("nie pyta gdy geofencing jest wyłączony — śledzenie GPS może zostać włączone", () => {
    expect(shouldPromptArrivalGeofence({ ...far, geofencingEnabled: false })).toBe(false);
  });

  it("nie pyta dla sesji stacjonarnej", () => {
    expect(shouldPromptArrivalGeofence({ ...far, categoryIsStationary: true })).toBe(false);
  });

  it("nie pyta gdy brak promienia albo odległości", () => {
    expect(shouldPromptArrivalGeofence({ ...far, geofenceRadiusMeters: undefined })).toBe(false);
    expect(shouldPromptArrivalGeofence({ ...far, distanceToDestKm: null })).toBe(false);
  });

  it("nie pyta wewnątrz promienia", () => {
    expect(shouldPromptArrivalGeofence({ ...far, distanceToDestKm: 0.2 })).toBe(false);
  });
});
