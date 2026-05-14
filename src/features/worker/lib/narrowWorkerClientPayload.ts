import { isRecord } from "@/lib/narrowApiListRows";
import type { AppSettings, Coord, Session, UserData } from "@/types/worker";

export function narrowSession(v: unknown): Session | null {
  if (!isRecord(v)) return null;
  if (
    typeof v.id !== "number" ||
    typeof v.startTime !== "string" ||
    typeof v.categoryId !== "number" ||
    typeof v.status !== "string"
  ) {
    return null;
  }
  const categoryName = v.categoryName === null || typeof v.categoryName === "string" ? v.categoryName : null;
  return {
    id: v.id,
    startTime: v.startTime,
    endTime: typeof v.endTime === "string" ? v.endTime : undefined,
    categoryId: v.categoryId,
    categoryName,
    categoryIsStationary: typeof v.categoryIsStationary === "boolean" ? v.categoryIsStationary : undefined,
    status: v.status,
    customerAddress:
      v.customerAddress === null || typeof v.customerAddress === "string" ? (v.customerAddress as string | null) : undefined,
    customerLat: v.customerLat === null || typeof v.customerLat === "string" ? (v.customerLat as string | null) : undefined,
    customerLng: v.customerLng === null || typeof v.customerLng === "string" ? (v.customerLng as string | null) : undefined,
    expectedDurationHours:
      v.expectedDurationHours === null || typeof v.expectedDurationHours === "string"
        ? (v.expectedDurationHours as string | null)
        : undefined,
    taskDescription:
      v.taskDescription === null || typeof v.taskDescription === "string" ? (v.taskDescription as string | null) : undefined,
    workOrderId:
      typeof v.workOrderId === "number" ? v.workOrderId : v.workOrderId === null ? null : undefined,
    customerFirstName:
      v.customerFirstName === null || typeof v.customerFirstName === "string"
        ? (v.customerFirstName as string | null)
        : undefined,
    customerLastName:
      v.customerLastName === null || typeof v.customerLastName === "string"
        ? (v.customerLastName as string | null)
        : undefined,
    resourceName: v.resourceName === null || typeof v.resourceName === "string" ? (v.resourceName as string | null) : undefined,
    materialName: v.materialName === null || typeof v.materialName === "string" ? (v.materialName as string | null) : undefined,
    quantityTons:
      v.quantityTons === null || typeof v.quantityTons === "number" ? (v.quantityTons as number | null) : undefined,
    hasPhotos: typeof v.hasPhotos === "boolean" ? v.hasPhotos : undefined,
    hasNotes: typeof v.hasNotes === "boolean" ? v.hasNotes : undefined,
  };
}

export function narrowAppSettings(v: unknown): AppSettings | null {
  if (v === null || typeof v !== "object" || !isRecord(v)) return null;
  const s: AppSettings = {};
  if (typeof v.requirePhotoToFinish === "boolean") s.requirePhotoToFinish = v.requirePhotoToFinish;
  if (typeof v.geofenceRadiusMeters === "number" && Number.isFinite(v.geofenceRadiusMeters)) {
    s.geofenceRadiusMeters = v.geofenceRadiusMeters;
  }
  if (typeof v.cancelWindowMinutes === "number" && Number.isFinite(v.cancelWindowMinutes)) {
    s.cancelWindowMinutes = v.cancelWindowMinutes;
  }
  if (typeof v.timeOverrunReminder === "boolean") s.timeOverrunReminder = v.timeOverrunReminder;
  if (typeof v.upcomingOrderReminderMinutes === "number" && Number.isFinite(v.upcomingOrderReminderMinutes)) {
    s.upcomingOrderReminderMinutes = v.upcomingOrderReminderMinutes;
  }
  return s;
}

export function narrowUserData(v: unknown): UserData | null {
  if (v === null || typeof v !== "object" || !isRecord(v)) return null;
  const u: UserData = {};
  if (typeof v.id === "number") u.id = v.id;
  if (typeof v.canCreateOwnOrders === "boolean") u.canCreateOwnOrders = v.canCreateOwnOrders;
  if (typeof v.notificationsEnabled === "boolean") u.notificationsEnabled = v.notificationsEnabled;
  return u;
}

/** Odpowiedź GET `/api/worker/gps`: `{ logs: Coord[] }`. */
export function narrowGpsPathLogs(body: unknown): Coord[] {
  if (!isRecord(body) || !Array.isArray(body.logs)) return [];
  const out: Coord[] = [];
  for (const p of body.logs) {
    if (!isRecord(p)) continue;
    const lat = typeof p.lat === "number" ? p.lat : typeof p.lat === "string" ? parseFloat(p.lat) : NaN;
    const lng = typeof p.lng === "number" ? p.lng : typeof p.lng === "string" ? parseFloat(p.lng) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const heading =
      p.heading === null || p.heading === undefined
        ? undefined
        : typeof p.heading === "number"
          ? p.heading
          : typeof p.heading === "string"
            ? parseFloat(p.heading)
            : undefined;
    let recordedAt: string | undefined;
    const rawT = p.recordedAt ?? p.timestamp;
    if (typeof rawT === "string" && rawT.length > 0) {
      recordedAt = rawT;
    } else if (typeof rawT === "number" && Number.isFinite(rawT)) {
      recordedAt = new Date(rawT).toISOString();
    }
    out.push({
      lat,
      lng,
      heading: heading !== undefined && Number.isFinite(heading) ? heading : undefined,
      ...(recordedAt !== undefined ? { recordedAt } : {}),
    });
  }
  return out;
}

export type NominatimHit = { lat: string; lon: string };

export function narrowNominatimHits(rows: unknown[]): NominatimHit[] {
  const out: NominatimHit[] = [];
  for (const r of rows) {
    if (!isRecord(r)) continue;
    if (typeof r.lat !== "string" || typeof r.lon !== "string") continue;
    out.push({ lat: r.lat, lon: r.lon });
  }
  return out;
}
