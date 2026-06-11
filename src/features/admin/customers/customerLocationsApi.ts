import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { adminApi } from "@/lib/appRoutes";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown } from "@/lib/parseApiJson";
import { resolveCompanyBaseCoords } from "@/lib/map/companyBaseLocation";
import type { RouteLngLat } from "@/lib/map/routeGeometryProvider";
import type { CustomerLocationRow } from "@/services/CustomerLocationService";
import { isCustomerLocationRow } from "./customerLocationForm";

export async function fetchLocationsAndRouteOrigin(customerId: number): Promise<{
  rows: CustomerLocationRow[];
  routeOrigin: RouteLngLat | null;
}> {
  const [locRes, settingsRes] = await Promise.all([
    fetchWithDeviceTelemetry(
      `Admin: customer ${customerId} locations`,
      `/api/customers/${customerId}/locations`,
      { cache: "no-store" },
      { category: "admin" }
    ),
    fetchWithDeviceTelemetry(
      "Admin: settings for route origin",
      adminApi.settings,
      { cache: "no-store" },
      {
        category: "admin",
      }
    ),
  ]);
  const locData = await parseJsonArray(locRes);
  const rows = locData.filter(isCustomerLocationRow);
  const settingsBody = await parseJsonUnknown(settingsRes);
  const routeOrigin =
    settingsBody && typeof settingsBody === "object" && !Array.isArray(settingsBody)
      ? resolveCompanyBaseCoords(settingsBody as Record<string, unknown>)
      : resolveCompanyBaseCoords(null);
  return { rows, routeOrigin };
}

export async function geocodeCustomerAddress(
  q: string
): Promise<{ lat: number; lng: number } | null> {
  const res = await fetchWithDeviceTelemetry(
    "Admin: geocode customer location",
    `/api/geocode?q=${encodeURIComponent(q)}`,
    { cache: "no-store" },
    { category: "admin" }
  );
  const data = (await res.json()) as {
    lat?: number | null;
    lng?: number | null;
    error?: string;
  };
  if (
    !res.ok ||
    data.error === "not_found" ||
    typeof data.lat !== "number" ||
    typeof data.lng !== "number"
  ) {
    return null;
  }
  return { lat: data.lat, lng: data.lng };
}
