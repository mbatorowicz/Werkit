import { WORKER_GPS_MAX_ACCURACY_METERS } from "@/features/worker/gps/workerGpsConstants";
import type { Coord } from "@/types/worker";

export type GpsAccuracySample = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  bearing?: number | null;
};

/** Wspólny filtr szpilek (web i native) — `null` gdy accuracy > 40 m. */
export function coordFromAccuracySample(sample: GpsAccuracySample): Coord | null {
  if (typeof sample.accuracy === "number" && sample.accuracy > WORKER_GPS_MAX_ACCURACY_METERS) {
    return null;
  }
  return {
    lat: sample.latitude,
    lng: sample.longitude,
    heading: sample.heading ?? sample.bearing ?? undefined,
  };
}

/** Odczyt z Capacitor BackgroundGeolocation → `Coord` albo `null` przy zbyt słabej dokładności. */
export function coordFromNativeBackgroundReading(location: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  bearing?: number | null;
}): Coord | null {
  return coordFromAccuracySample(location);
}

export function coordFromGeolocationCoords(coords: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
}): Coord | null {
  return coordFromAccuracySample(coords);
}

/** Meta do device_logs przy odrzuceniu próbki — bez dokładnych współrzędnych. */
export function gpsRejectLogMeta(accuracy: number | null | undefined): Record<string, unknown> {
  if (typeof accuracy !== "number" || !Number.isFinite(accuracy)) return {};
  return { accuracy: Math.round(accuracy) };
}
