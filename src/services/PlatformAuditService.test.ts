import { beforeEach, describe, expect, it, vi } from "vitest";

const { insertMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: insertMock,
  },
}));

vi.mock("@/db/schema", () => ({
  platformAuditEvents: { id: "id" },
}));

import {
  clampAuditListLimit,
  isPlatformAuditAction,
  PLATFORM_AUDIT_LIST_DEFAULT_LIMIT,
  PLATFORM_AUDIT_LIST_MAX_LIMIT,
  PlatformAuditService,
  sanitizeAuditMetadata,
} from "./PlatformAuditService";

describe("PlatformAuditService", () => {
  beforeEach(() => {
    insertMock.mockReset();
  });

  it("allowlista odrzuca nieznane akcje", () => {
    expect(isPlatformAuditAction("company.create")).toBe(true);
    expect(isPlatformAuditAction("admin.reset_password")).toBe(true);
    expect(isPlatformAuditAction("drop_table")).toBe(false);
  });

  it("sanitizeAuditMetadata wycina klucze z password", () => {
    expect(
      sanitizeAuditMetadata({
        from: false,
        to: true,
        password: "secret",
        newPassword: "x",
        passwordHash: "hash",
      })
    ).toEqual({ from: false, to: true });
  });

  it("insert zapisuje wiersz bez haseł w metadata", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values });

    await PlatformAuditService.insert({
      actorUserId: 9,
      companyId: 3,
      action: "admin.reset_password",
      targetType: "user",
      targetId: 12,
      metadata: { password: "nie-wolno", reason: "support" },
    });

    expect(values).toHaveBeenCalledWith({
      actorUserId: 9,
      companyId: 3,
      action: "admin.reset_password",
      targetType: "user",
      targetId: 12,
      metadata: { reason: "support" },
    });
  });

  it("insert odrzuca nieznaną akcję bez zapisu", async () => {
    await expect(
      PlatformAuditService.insert({
        actorUserId: 1,
        action: "drop_table" as never,
      })
    ).rejects.toThrow("invalid_audit_action");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("clampAuditListLimit: default 100, max 200", () => {
    expect(clampAuditListLimit(undefined)).toBe(PLATFORM_AUDIT_LIST_DEFAULT_LIMIT);
    expect(clampAuditListLimit(0)).toBe(PLATFORM_AUDIT_LIST_DEFAULT_LIMIT);
    expect(clampAuditListLimit(50)).toBe(50);
    expect(clampAuditListLimit(999)).toBe(PLATFORM_AUDIT_LIST_MAX_LIMIT);
  });
});
