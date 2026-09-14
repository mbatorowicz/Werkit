import { describe, expect, it } from "vitest";
import {
  IMPERSONATION_END_PATH,
  IMPERSONATION_REASON_MAX_LENGTH,
  isImpersonationEndApi,
  isImpersonationStatusApi,
  normalizeImpersonationReason,
  readImpersonatorUserId,
} from "@/lib/impersonationGuard";

describe("impersonationGuard", () => {
  it("readImpersonatorUserId akceptuje dodatni int", () => {
    expect(readImpersonatorUserId({ impersonatorUserId: 4 })).toBe(4);
    expect(readImpersonatorUserId({ impersonatorUserId: "8" })).toBe(8);
    expect(readImpersonatorUserId({ impersonatorUserId: 0 })).toBeNull();
    expect(readImpersonatorUserId({})).toBeNull();
  });

  it("ścieżki start/end", () => {
    expect(isImpersonationEndApi(IMPERSONATION_END_PATH, "POST")).toBe(true);
    expect(isImpersonationEndApi(IMPERSONATION_END_PATH, "GET")).toBe(false);
    expect(isImpersonationStatusApi("/api/platform/impersonation", "GET")).toBe(true);
    expect(isImpersonationStatusApi("/api/platform/impersonation", "POST")).toBe(false);
  });

  it("normalizeImpersonationReason tnie do 200 i puste → null", () => {
    expect(normalizeImpersonationReason("  ")).toBeNull();
    expect(normalizeImpersonationReason(12)).toBeNull();
    expect(normalizeImpersonationReason("  ticket  ")).toBe("ticket");
    const long = "x".repeat(IMPERSONATION_REASON_MAX_LENGTH + 10);
    expect(normalizeImpersonationReason(long)?.length).toBe(IMPERSONATION_REASON_MAX_LENGTH);
  });
});
