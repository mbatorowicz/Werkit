import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("kasuje auth_token z Max-Age=0 i Path=/ (HTTPS = SameSite=None; Secure)", async () => {
    const res = await POST(
      new Request("https://app.example/api/auth/logout", { method: "POST" }),
      undefined
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain("auth_token=");
    expect(setCookie.toLowerCase()).toMatch(/max-age=0/);
    expect(setCookie.toLowerCase()).toContain("path=/");
    expect(setCookie.toLowerCase()).toMatch(/samesite=none/i);
    expect(setCookie.toLowerCase()).toContain("secure");
  });

  it("kasuje też platform_resume", async () => {
    const res = await POST(
      new Request("https://app.example/api/auth/logout", { method: "POST" }),
      undefined
    );
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain("platform_resume=");
    expect(setCookie.toLowerCase()).toMatch(/max-age=0/);
  });
});
