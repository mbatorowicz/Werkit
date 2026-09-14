import type { Session } from "@/types/worker";

/**
 * Czy worker ma uruchomić watcher GPS (web lub native).
 * Wyłączenie flagi organizacji albo kategoria stacjonarna = cisza na urządzeniu.
 */
export function shouldStartGpsWatcher(
  session: Session | null,
  gpsTrackingEnabled: boolean | undefined
): boolean {
  if (!session) return false;
  if (gpsTrackingEnabled === false) return false;
  if (session.categoryIsStationary) return false;
  return true;
}
