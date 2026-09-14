import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  AUTH_TOKEN_COOKIE,
  authTokenCookieAttrs,
  clearAuthTokenCookie,
  isHttpsRequest,
} from "@/lib/authCookie";

describe("authCookie", () => {
  it("isHttpsRequest honoruje x-forwarded-proto", () => {
    const req = new Request("http://localhost/api/auth/logout", {
      headers: { "x-forwarded-proto": "https" },
    });
    expect(isHttpsRequest(req)).toBe(true);
  });

  it("isHttpsRequest czyta schemat URL gdy brak X-Forwarded-Proto", () => {
    expect(isHttpsRequest(new Request("http://localhost/api/auth/logout"))).toBe(false);
    expect(isHttpsRequest(new Request("https://app.example/api/auth/logout"))).toBe(true);
  });

  it("authTokenCookieAttrs: HTTPS → Secure + SameSite=None (Capacitor)", () => {
    expect(authTokenCookieAttrs(true)).toMatchObject({
      name: AUTH_TOKEN_COOKIE,
      httpOnly: true,
      path: "/",
      secure: true,
      sameSite: "none",
    });
  });

  it("authTokenCookieAttrs: HTTP → Lax, bez Secure", () => {
    expect(authTokenCookieAttrs(false)).toMatchObject({
      path: "/",
      secure: false,
      sameSite: "lax",
    });
  });

  it("clearAuthTokenCookie (HTTPS) → Max-Age=0; Path=/; SameSite=None; Secure", () => {
    const res = NextResponse.json({ success: true });
    clearAuthTokenCookie(res, true);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain(`${AUTH_TOKEN_COOKIE}=`);
    expect(setCookie.toLowerCase()).toMatch(/max-age=0/);
    expect(setCookie.toLowerCase()).toContain("path=/");
    expect(setCookie.toLowerCase()).toMatch(/samesite=none/i);
    expect(setCookie.toLowerCase()).toContain("secure");
  });

  it("clearAuthTokenCookie bez schematu emituje oba warianty (WebView + localhost)", () => {
    const res = NextResponse.json({ ok: true });
    clearAuthTokenCookie(res);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toMatch(/samesite=lax/i);
    expect(setCookie.toLowerCase()).toMatch(/samesite=none/i);
    expect(setCookie.toLowerCase()).toMatch(/max-age=0/);
    expect(setCookie.toLowerCase()).toContain("path=/");
  });
});
