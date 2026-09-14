import type { GpsPolicy } from "@/lib/categoryPolicy";

/**
 * Czy worker ma uruchomić watcher GPS (web lub native).
 * Wyłączenie flagi organizacji albo gpsPolicy stationary = cisza na urządzeniu.
 */
export function shouldStartGpsWatcher(
  session: { gpsPolicy?: GpsPolicy } | null,
  gpsTrackingEnabled: boolean | undefined
): boolean {
  if (!session) return false;
  if (gpsTrackingEnabled === false) return false;
  if (session.gpsPolicy === "stationary") return false;
  return true;
}
