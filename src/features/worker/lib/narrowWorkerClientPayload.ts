import { isRecord } from "@/lib/narrowApiListRows";
import { coordFromRawGpsRow, type RawGpsCoordinateRow } from "@/lib/gps/pathFromLogRows";
import type { AppSettings, Coord, Session, UserData } from "@/types/worker";
import { narrowOrderType } from "@/lib/orderType";
import { parseRouteWaypoints } from "@/lib/map/routeWaypoints";

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
  const categoryName =
    v.categoryName === null || typeof v.categoryName === "string" ? v.categoryName : null;
  return {
    id: v.id,
    startTime: v.startTime,
    endTime: typeof v.endTime === "string" ? v.endTime : undefined,
    categoryId: v.categoryId,
    categoryName,
    categoryColor:
      v.categoryColor === null || typeof v.categoryColor === "string"
        ? (v.categoryColor as string | null)
        : undefined,
    categoryShowMaterial:
      typeof v.categoryShowMaterial === "boolean" ? v.categoryShowMaterial : undefined,
    categoryShowCustomer:
      typeof v.categoryShowCustomer === "boolean" ? v.categoryShowCustomer : undefined,
    categoryShowQuantity:
      typeof v.categoryShowQuantity === "boolean" ? v.categoryShowQuantity : undefined,
    categoryShowTaskDescription:
      typeof v.categoryShowTaskDescription === "boolean"
        ? v.categoryShowTaskDescription
        : undefined,
    categoryIsStationary:
      typeof v.categoryIsStationary === "boolean" ? v.categoryIsStationary : undefined,
    status: v.status,
    customerAddress:
      v.customerAddress === null || typeof v.customerAddress === "string"
        ? (v.customerAddress as string | null)
        : undefined,
    customerLat:
      v.customerLat === null || typeof v.customerLat === "string"
        ? (v.customerLat as string | null)
        : undefined,
    customerLng:
      v.customerLng === null || typeof v.customerLng === "string"
        ? (v.customerLng as string | null)
        : undefined,
    expectedDurationHours:
      v.expectedDurationHours === null || typeof v.expectedDurationHours === "string"
        ? (v.expectedDurationHours as string | null)
        : undefined,
    taskDescription:
      v.taskDescription === null || typeof v.taskDescription === "string"
        ? (v.taskDescription as string | null)
        : undefined,
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
    resourceName:
      v.resourceName === null || typeof v.resourceName === "string"
        ? (v.resourceName as string | null)
        : undefined,
    materialName:
      v.materialName === null || typeof v.materialName === "string"
        ? (v.materialName as string | null)
        : undefined,
    quantityTons:
      v.quantityTons === null || typeof v.quantityTons === "number"
        ? (v.quantityTons as number | null)
        : undefined,
    hasPhotos: typeof v.hasPhotos === "boolean" ? v.hasPhotos : undefined,
    hasNotes: typeof v.hasNotes === "boolean" ? v.hasNotes : undefined,
    customerLocationId:
      typeof v.customerLocationId === "number"
        ? v.customerLocationId
        : v.customerLocationId === null
          ? null
          : undefined,
    routeWaypoints: parseRouteWaypoints(v.routeWaypoints),
    orderType: v.orderType != null ? narrowOrderType(v.orderType) : undefined,
    repairDescription:
      v.repairDescription === null || typeof v.repairDescription === "string"
        ? (v.repairDescription as string | null)
        : undefined,
    resourceGroupId:
      typeof v.resourceGroupId === "number"
        ? v.resourceGroupId
        : v.resourceGroupId === null
          ? null
          : undefined,
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
  if (
    typeof v.upcomingOrderReminderMinutes === "number" &&
    Number.isFinite(v.upcomingOrderReminderMinutes)
  ) {
    s.upcomingOrderReminderMinutes = v.upcomingOrderReminderMinutes;
  }
  if (typeof v.durEnabled === "boolean") s.durEnabled = v.durEnabled;
  return s;
}

export function narrowUserData(v: unknown): UserData | null {
  if (v === null || typeof v !== "object" || !isRecord(v)) return null;
  const u: UserData = {};
  if (typeof v.id === "number") u.id = v.id;
  if (typeof v.canCreateOwnOrders === "boolean") u.canCreateOwnOrders = v.canCreateOwnOrders;
  if (typeof v.notificationsEnabled === "boolean") u.notificationsEnabled = v.notificationsEnabled;
  if (typeof v.canEditRoute === "boolean") u.canEditRoute = v.canEditRoute;
  if (typeof v.canCreateCustomers === "boolean") u.canCreateCustomers = v.canCreateCustomers;
  if (typeof v.isDurWorker === "boolean") u.isDurWorker = v.isDurWorker;
  return u;
}

/** Odpowiedź GET `/api/worker/gps`: `{ logs: Coord[] }`. */
export function narrowGpsPathLogs(body: unknown): Coord[] {
  if (!isRecord(body) || !Array.isArray(body.logs)) return [];
  const out: Coord[] = [];
  for (const p of body.logs) {
    if (!isRecord(p)) continue;
    const c = coordFromRawGpsRow(p as RawGpsCoordinateRow);
    if (!c) continue;
    out.push(c);
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
