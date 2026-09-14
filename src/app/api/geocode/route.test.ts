import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonError, jsonOk } from "@/lib/apiRoute";

vi.mock("@/db", () => ({ db: {} }));

vi.mock("@/lib/apiTenant", () => ({
  requireCompanyScopedSession: vi.fn(),
}));

vi.mock("@/services/GeocodeRateLimitService", () => ({
  GeocodeRateLimitService: {
    isLimited: vi.fn(),
    record: vi.fn(),
  },
}));

import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { GeocodeRateLimitService } from "@/services/GeocodeRateLimitService";
import { GET } from "@/app/api/geocode/route";

const scopedOk = {
  ok: true as const,
  data: {
    companyId: 4,
    session: { userId: 1, role: "admin" as const, companyId: 4 },
  },
};

describe("GET /api/geocode", () => {
  beforeEach(() => {
    vi.mocked(requireCompanyScopedSession).mockReset();
    vi.mocked(GeocodeRateLimitService.isLimited).mockReset();
    vi.mocked(GeocodeRateLimitService.record).mockReset();
    vi.unstubAllGlobals();
  });

  it("bez sesji → 401 nawet gdy proxy nie działa (obrona w głąb)", async () => {
    vi.mocked(requireCompanyScopedSession).mockResolvedValue({
      ok: false,
      response: jsonError("Unauthorized", 401),
    });

    const res = await GET(new Request("http://localhost/api/geocode?q=warszawa"), undefined);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Unauthorized");
    expect(GeocodeRateLimitService.isLimited).not.toHaveBeenCalled();
  });

  it("zbyt krótka fraza → 400 short_query (po auth)", async () => {
    vi.mocked(requireCompanyScopedSession).mockResolvedValue(scopedOk);
    const res = await GET(new Request("http://localhost/api/geocode?q=ab"), undefined);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("short_query");
  });

  it("limit 30/min/firmę → 429 too_many_geocode", async () => {
    vi.mocked(requireCompanyScopedSession).mockResolvedValue(scopedOk);
    vi.mocked(GeocodeRateLimitService.isLimited).mockResolvedValue(true);

    const res = await GET(new Request("http://localhost/api/geocode?q=warszawa"), undefined);
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("too_many_geocode");
    expect(GeocodeRateLimitService.record).not.toHaveBeenCalled();
  });

  it("Nominatim 200 z koordynatami", async () => {
    vi.mocked(requireCompanyScopedSession).mockResolvedValue(scopedOk);
    vi.mocked(GeocodeRateLimitService.isLimited).mockResolvedValue(false);
    vi.mocked(GeocodeRateLimitService.record).mockResolvedValue(1);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonOk([{ lat: "52.2297", lon: "21.0122" }])
      )
    );

    const res = await GET(new Request("http://localhost/api/geocode?q=warszawa"), undefined);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { lat: number; lng: number };
    expect(body.lat).toBeCloseTo(52.2297);
    expect(body.lng).toBeCloseTo(21.0122);
    expect(GeocodeRateLimitService.record).toHaveBeenCalledWith(4);
  });
});
