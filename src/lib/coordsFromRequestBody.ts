/** Parsuje { latitude, longitude } z JSON body żądania worker API. */
export function coordsFromRequestBody(body: unknown): { lat: number; lng: number } | null {
  if (body === null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const lat = o.latitude;
  const lng = o.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function coordPairToNumericStrings(c: { lat: number; lng: number }): {
  lat: string;
  lng: string;
} {
  return {
    lat: c.lat.toFixed(8),
    lng: c.lng.toFixed(8),
  };
}
