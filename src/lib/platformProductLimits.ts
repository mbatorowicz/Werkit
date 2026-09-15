import { GPS_MAX_POINTS_PER_REQUEST } from "@/lib/gpsPayloadLimits";
import { PHOTO_MAX_DECODED_BYTES } from "@/lib/photoPayloadLimits";
import { MAX_DEVICE_LOGS_PER_MINUTE } from "@/lib/deviceLogLimits";

/**
 * Stałe produktu pokazywane w `/platform` (PL3) — tylko odczyt, bez silnika seats.
 * Źródła: S2 (GPS 200, foto 4 MiB, throttle `device_logs`).
 */
export const PLATFORM_PRODUCT_LIMITS = {
  gpsPointsPerRequest: GPS_MAX_POINTS_PER_REQUEST,
  photoMaxMib: PHOTO_MAX_DECODED_BYTES / (1024 * 1024),
  deviceLogsPerMinute: MAX_DEVICE_LOGS_PER_MINUTE,
} as const;
