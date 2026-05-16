import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";

/** Domyślna baza (okolice Węgrów) — tylko gdy w `company_settings` brak współrzędnych. */
export const FALLBACK_COMPANY_BASE: RouteLngLat = { lat: 52.401, lng: 22.015 };

export type CompanyBaseSource = {
  baseLatitude?: string | number | null;
  baseLongitude?: string | number | null;
};

/** Współrzędne bazy z ustawień firmy lub `null`, gdy nie ustawiono. */
export function parseCompanyBaseCoords(source: CompanyBaseSource | null | undefined): RouteLngLat | null {
  const lat = Number(source?.baseLatitude);
  const lng = Number(source?.baseLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Baza firmy do startu trasy OSRM — zawsze z danych firmy, z sensownym fallbackiem. */
export function resolveCompanyBaseCoords(source: CompanyBaseSource | null | undefined): RouteLngLat {
  return parseCompanyBaseCoords(source) ?? FALLBACK_COMPANY_BASE;
}

/** Tekst adresu do geokodowania bazy firmy. */
export function formatCompanyAddressQuery(parts: {
  companyAddress?: string | null;
  zipCode?: string | null;
  city?: string | null;
}): string {
  return [parts.companyAddress?.trim(), parts.zipCode?.trim(), parts.city?.trim()].filter(Boolean).join(", ");
}
