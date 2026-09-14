import { resolveOrderType } from "@/lib/orderType";
import { resolvedCategoryFieldFlags, type CategoryFieldFlags } from "@/lib/workOrderCategoryFields";
import type { OrderType } from "@/types/worker";

/**
 * Odczyt polityki z wiersza `resource_categories` — tabela zostaje jedna.
 * Call-site’y (GPS, formularze, etykiety) idą przez te funkcje, nie przez surowe booleany z wiersza.
 */

/** Śledzenie trasy vs praca na placu / w warsztacie. */
export type GpsPolicy = "stationary" | "track";

/** Rodzaj zlecenia wynikający z kategorii (i ewentualnie jawnego override). */
export type OrderKind = OrderType;

export type CategoryFieldVisibility = {
  showCustomer: boolean;
  showMaterial: boolean;
  showQuantity: boolean;
  showTaskDescription: boolean;
};

export type CategoryPolicy = {
  gpsPolicy: GpsPolicy;
  orderKind: OrderKind;
  fieldVisibility: CategoryFieldVisibility;
};

export type CategoryPolicySource = {
  isStationary?: boolean | null;
  orderType?: unknown;
} & CategoryFieldFlags;

export type SessionGpsPolicySource = {
  gpsPolicy?: GpsPolicy | null;
  categoryIsStationary?: boolean | null;
};

export function resolveGpsPolicy(isStationary: boolean | null | undefined): GpsPolicy {
  return isStationary === true ? "stationary" : "track";
}

export function narrowGpsPolicy(value: unknown): GpsPolicy | undefined {
  return value === "stationary" || value === "track" ? value : undefined;
}

/** GPS sesji: kanoniczne `gpsPolicy`, z fallbackiem do legacy `categoryIsStationary`. */
export function gpsPolicyFromSession(
  session: SessionGpsPolicySource | null | undefined
): GpsPolicy {
  const explicit = narrowGpsPolicy(session?.gpsPolicy);
  if (explicit) return explicit;
  return resolveGpsPolicy(session?.categoryIsStationary);
}

export function isStationaryGpsPolicy(policy: GpsPolicy): boolean {
  return policy === "stationary";
}

export function resolveOrderKind(explicit: unknown, categoryOrderType: unknown): OrderKind {
  return resolveOrderType(explicit, categoryOrderType);
}

export function resolveFieldVisibility(
  flags: CategoryFieldFlags | null | undefined
): CategoryFieldVisibility {
  return resolvedCategoryFieldFlags(flags);
}

export function resolveCategoryPolicy(
  row: CategoryPolicySource | null | undefined,
  explicitOrderType?: unknown
): CategoryPolicy {
  return {
    gpsPolicy: resolveGpsPolicy(row?.isStationary),
    orderKind: resolveOrderKind(explicitOrderType, row?.orderType),
    fieldVisibility: resolveFieldVisibility(row),
  };
}
