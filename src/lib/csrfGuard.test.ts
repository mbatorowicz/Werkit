import { describe, expect, it } from "vitest";
import { CSRF_REJECTED, isMutatingHttpMethod, isTrustedMutationOrigin } from "@/lib/csrfGuard";

function req(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

describe("csrfGuard", () => {
  it("GET nie jest mutacją", () => {
    expect(isMutatingHttpMethod("GET")).toBe(false);
    expect(isMutatingHttpMethod("POST")).toBe(true);
  });

  it("ten sam Origin co URL → zaufany", () => {
    expect(
      isTrustedMutationOrigin(
        req("http://localhost/api/auth/logout", {
          method: "POST",
          headers: { origin: "http://localhost" },
        })
      )
    ).toBe(true);
  });

  it("obcy Origin (form CSRF) → odrzut", () => {
    expect(
      isTrustedMutationOrigin(
        req("https://app.example/api/auth/logout", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        })
      )
    ).toBe(false);
  });

  it("brak Origin + JSON → zaufany (klienci API)", () => {
    expect(
      isTrustedMutationOrigin(
        req("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
        })
      )
    ).toBe(true);
  });

  it("brak Origin + brak JSON → odrzut (formularz HTML)", () => {
    expect(
      isTrustedMutationOrigin(req("http://localhost/api/auth/logout", { method: "POST" }))
    ).toBe(false);
  });

  it("Origin capacitor://localhost → zaufany", () => {
    expect(
      isTrustedMutationOrigin(
        req("https://werkit.example/api/worker/session/cancel", {
          method: "POST",
          headers: { origin: "capacitor://localhost" },
        })
      )
    ).toBe(true);
  });

  it("Host + x-forwarded-proto zgadza się z Origin", () => {
    expect(
      isTrustedMutationOrigin(
        req("http://127.0.0.1/api/auth/logout", {
          method: "POST",
          headers: {
            origin: "https://werkit.example",
            host: "werkit.example",
            "x-forwarded-proto": "https",
          },
        })
      )
    ).toBe(true);
  });

  it("kod błędu SSOT", () => {
    expect(CSRF_REJECTED).toBe("csrf_rejected");
  });
});
