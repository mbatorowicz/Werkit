import { jsonError, jsonOk, withApiErrorHandling } from "@/lib/apiRoute";

export const dynamic = "force-dynamic";

const USER_AGENT = "WerkitERP/1.9 (fleet logistics; admin geocode)";

export const GET = withApiErrorHandling(async (request: Request) => {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return jsonError("short_query", 400);
  }
  if (q.length > 280) {
    return jsonError("query_too_long", 400);
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "pl,en",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return jsonError("upstream", 502);
  }

  const data: unknown = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    return jsonError("not_found", 404);
  }

  const row = data[0] as Record<string, unknown>;
  const lat = typeof row.lat === "string" ? Number.parseFloat(row.lat) : NaN;
  const lon = typeof row.lon === "string" ? Number.parseFloat(row.lon) : NaN;

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return jsonError("bad_payload", 502);
  }

  return jsonOk({ lat, lng: lon });
}, { defaultErrorCode: "failed" });
