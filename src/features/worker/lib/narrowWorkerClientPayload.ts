import { isRecord } from "@/lib/narrowApiListRows";
import { coordFromRawGpsRow, type RawGpsCoordinateRow } from "@/lib/gps/pathFromLogRows";
import type { AppSettings, Coord, Session, UserData } from "@/types/worker";
import { narrowOrderType } from "@/lib/orderType";
import { parseRouteWaypoints } from "@/lib/map/routeWaypoints";

/** string lub null; inne wartości → null. */
function stringOrNull(v: unknown): string | null {
  return v === null || typeof v === "string" ? v : null;
}

/** string lub null; inne wartości → undefined. */
function nullableString(v: unknown): string | null | undefined {
  return v === null || typeof v === "string" ? v : undefined;
}

function optionalString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function optionalBoolean(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

/** number lub null; inne wartości → undefined. */
function nullableNumber(v: unknown): number | null | undefined {
  return v === null || typeof v === "number" ? v : undefined;
}

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
  return {
    id: v.id,
    startTime: v.startTime,
    endTime: optionalString(v.endTime),
    categoryId: v.categoryId,
    categoryName: stringOrNull(v.categoryName),
    categoryColor: nullableString(v.categoryColor),
    categoryShowMaterial: optionalBoolean(v.categoryShowMaterial),
    categoryShowCustomer: optionalBoolean(v.categoryShowCustomer),
    categoryShowQuantity: optionalBoolean(v.categoryShowQuantity),
    categoryShowTaskDescription: optionalBoolean(v.categoryShowTaskDescription),
    categoryIsStationary: optionalBoolean(v.categoryIsStationary),
    status: v.status,
    customerAddress: nullableString(v.customerAddress),
    customerLat: nullableString(v.customerLat),
    customerLng: nullableString(v.customerLng),
    expectedDurationHours: nullableString(v.expectedDurationHours),
    taskDescription: nullableString(v.taskDescription),
    workOrderId: nullableNumber(v.workOrderId),
    customerFirstName: nullableString(v.customerFirstName),
    customerLastName: nullableString(v.customerLastName),
    customerPhone: nullableString(v.customerPhone),
    resourceName: nullableString(v.resourceName),
    materialName: nullableString(v.materialName),
    quantityTons: nullableNumber(v.quantityTons),
    hasPhotos: optionalBoolean(v.hasPhotos),
    hasNotes: optionalBoolean(v.hasNotes),
    customerLocationId: nullableNumber(v.customerLocationId),
    routeWaypoints: parseRouteWaypoints(v.routeWaypoints),
    orderType: v.orderType != null ? narrowOrderType(v.orderType) : undefined,
    repairDescription: nullableString(v.repairDescription),
    resourceGroupId: nullableNumber(v.resourceGroupId),
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
