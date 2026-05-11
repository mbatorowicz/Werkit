import { WORKER_GPS_MAX_ACCURACY_METERS } from "@/features/worker/gps/workerGpsConstants";
import type { Coord } from "@/types/worker";

/** Odczyt z Capacitor BackgroundGeolocation → `Coord` albo `null` przy zbyt słabej dokładności. */
export function coordFromNativeBackgroundReading(location: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  bearing?: number | null;
}): Coord | null {
  if (typeof location.accuracy === "number" && location.accuracy > WORKER_GPS_MAX_ACCURACY_METERS) {
    return null;
  }
  return {
    lat: location.latitude,
    lng: location.longitude,
    heading: location.bearing ?? undefined,
  };
}
