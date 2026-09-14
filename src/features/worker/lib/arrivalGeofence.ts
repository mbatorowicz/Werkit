import type { GpsPolicy } from "@/lib/categoryPolicy";

/** Czy checkpoint „Dojechał” ma pokazać potwierdzenie poza promieniem geofence. */
export function shouldPromptArrivalGeofence(args: {
  gpsPolicy: GpsPolicy;
  geofencingEnabled?: boolean;
  geofenceRadiusMeters?: number;
  distanceToDestKm: number | null;
}): boolean {
  if (args.gpsPolicy === "stationary") return false;
  if (args.geofencingEnabled === false) return false;
  if (!args.geofenceRadiusMeters || args.distanceToDestKm === null) return false;
  return args.distanceToDestKm * 1000 > args.geofenceRadiusMeters;
}
