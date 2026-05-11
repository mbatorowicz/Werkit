import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const USER_AGENT = "WerkitERP/1.9 (fleet logistics; admin geocode)";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ error: "short_query" }, { status: 400 });
  }
  if (q.length > 280) {
    return NextResponse.json({ error: "query_too_long" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "pl,en",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const row = data[0] as Record<string, unknown>;
    const lat = typeof row.lat === "string" ? Number.parseFloat(row.lat) : NaN;
    const lon = typeof row.lon === "string" ? Number.parseFloat(row.lon) : NaN;

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return NextResponse.json({ error: "bad_payload" }, { status: 502 });
    }

    return NextResponse.json({ lat, lng: lon });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
