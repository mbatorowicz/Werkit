/** Czy checkpoint „Dojechał” ma pokazać potwierdzenie poza promieniem geofence. */
export function shouldPromptArrivalGeofence(args: {
  categoryIsStationary: boolean;
  geofencingEnabled?: boolean;
  geofenceRadiusMeters?: number;
  distanceToDestKm: number | null;
}): boolean {
  if (args.categoryIsStationary) return false;
  if (args.geofencingEnabled === false) return false;
  if (!args.geofenceRadiusMeters || args.distanceToDestKm === null) return false;
  return args.distanceToDestKm * 1000 > args.geofenceRadiusMeters;
}
