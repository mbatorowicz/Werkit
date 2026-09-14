import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { signSessionJwt } from "@/lib/auth";
import { proxy } from "@/proxy";

async function authedRequest(
  path: string,
  payload: Parameters<typeof signSessionJwt>[0],
  expiresIn = "30m"
) {
  const token = await signSessionJwt(payload, expiresIn);
  return new NextRequest(new URL(path, "http://localhost"), {
    headers: { cookie: `auth_token=${token}` },
  });
}

describe("proxy — impersonacja", () => {
  it("JWT z impersonatorUserId → /api/worker 403", async () => {
    const req = await authedRequest("/api/worker/session", {
      userId: 10,
      role: "admin",
      companyId: 1,
      impersonatorUserId: 2,
    });
    const res = await proxy(req);
    expect(res.status).toBe(403);
  });

  it("JWT z impersonatorUserId → /worker redirect /admin", async () => {
    const req = await authedRequest("/worker", {
      userId: 10,
      role: "admin",
      companyId: 1,
      impersonatorUserId: 2,
    });
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin");
  });

  it("czysty superadmin nadal 403 na /api/admin", async () => {
    const req = await authedRequest("/api/admin/users", {
      userId: 2,
      role: "superadmin",
      companyId: null,
    });
    const res = await proxy(req);
    expect(res.status).toBe(403);
  });

  it("impersonacja admina wpuszcza /admin", async () => {
    const req = await authedRequest("/admin", {
      userId: 10,
      role: "admin",
      companyId: 1,
      impersonatorUserId: 2,
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });

  it("POST /api/platform/impersonation/end przechodzi bez JWT", async () => {
    const req = new NextRequest(new URL("/api/platform/impersonation/end", "http://localhost"), {
      method: "POST",
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });
});
