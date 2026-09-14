import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

vi.mock("@/lib/auth", () => ({
  getAuthSession: vi.fn(),
}));

vi.mock("@/services/AuthPrincipalService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/AuthPrincipalService")>();
  return {
    ...actual,
    AuthPrincipalService: {
      resolve: vi.fn(),
    },
  };
});

import { jsonError } from "@/lib/apiRoute";
import {
  clearAuthTokenCookie,
  requireLivePrincipalOr401,
  unauthorizedAndClearAuthToken,
} from "@/lib/livePrincipal";
import { AuthPrincipalService } from "@/services/AuthPrincipalService";

describe("livePrincipal", () => {
  it("unauthorizedAndClearAuthToken ustawia Path=/ i Max-Age=0", () => {
    const res = unauthorizedAndClearAuthToken();
    expect(res.status).toBe(401);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain("auth_token=");
    expect(setCookie.toLowerCase()).toMatch(/max-age=0/);
    expect(setCookie.toLowerCase()).toContain("path=/");
  });

  it("clearAuthTokenCookie działa na dowolnym NextResponse", () => {
    const res = jsonError("Forbidden", 403);
    clearAuthTokenCookie(res);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain("path=/");
  });

  it("brak sesji → 401 bez kasowania cookie (nie ma tokena)", async () => {
    const result = await requireLivePrincipalOr401(null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("set-cookie")).toBeNull();
  });

  it("martwy principal → 401 i kasuje cookie", async () => {
    vi.mocked(AuthPrincipalService.resolve).mockResolvedValue(null);
    const result = await requireLivePrincipalOr401({
      userId: 1,
      role: "admin",
      companyId: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("set-cookie") ?? "").toMatch(/auth_token=/i);
  });

  it("żywy principal → ok", async () => {
    vi.mocked(AuthPrincipalService.resolve).mockResolvedValue({
      userId: 1,
      role: "admin",
      companyId: 4,
      fullName: "Ada",
    });
    const result = await requireLivePrincipalOr401({
      userId: 1,
      role: "worker",
      companyId: 99,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.principal).toMatchObject({ userId: 1, role: "admin", companyId: 4 });
  });

  it("jwtFromLivePrincipal zachowuje impersonatorUserId", async () => {
    const { jwtFromLivePrincipal } = await import("@/lib/livePrincipal");
    expect(
      jwtFromLivePrincipal({
        userId: 9,
        role: "viewer",
        companyId: 3,
        fullName: "Ewa",
        impersonatorUserId: 2,
      })
    ).toEqual({
      userId: 9,
      role: "viewer",
      companyId: 3,
      impersonatorUserId: 2,
    });
  });
});
