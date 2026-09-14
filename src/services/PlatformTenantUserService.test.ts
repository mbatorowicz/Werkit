import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, updateMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock("@/db/schema", () => ({
  users: {
    id: "id",
    fullName: "fullName",
    usernameEmail: "usernameEmail",
    role: "role",
    isActive: "isActive",
    lastLoginAt: "lastLoginAt",
    passwordHash: "passwordHash",
    companyId: "companyId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  desc: (col: unknown) => col,
  and: (...args: unknown[]) => args,
  count: () => "count",
  inArray: (_col: unknown, val: unknown) => val,
}));

import {
  PlatformTenantUserService,
  tenantUserDeactivationBlockedReason,
} from "./PlatformTenantUserService";

describe("tenantUserDeactivationBlockedReason", () => {
  it("blokuje dezaktywację jedynego aktywnego admina", () => {
    expect(
      tenantUserDeactivationBlockedReason({
        targetRole: "admin",
        currentlyActive: true,
        nextIsActive: false,
        activeAdminCount: 1,
      })
    ).toBe("last_admin");
  });

  it("pozwala dezaktywować viewera i nie-ostatniego admina", () => {
    expect(
      tenantUserDeactivationBlockedReason({
        targetRole: "viewer",
        currentlyActive: true,
        nextIsActive: false,
        activeAdminCount: 1,
      })
    ).toBeNull();
    expect(
      tenantUserDeactivationBlockedReason({
        targetRole: "admin",
        currentlyActive: true,
        nextIsActive: false,
        activeAdminCount: 2,
      })
    ).toBeNull();
  });

  it("pozwala ponownie aktywować admina", () => {
    expect(
      tenantUserDeactivationBlockedReason({
        targetRole: "admin",
        currentlyActive: false,
        nextIsActive: true,
        activeAdminCount: 0,
      })
    ).toBeNull();
  });
});

describe("PlatformTenantUserService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    updateMock.mockReset();
  });

  it("lista nie zawiera passwordHash", async () => {
    const orderBy = vi.fn().mockResolvedValue([
      {
        id: 2,
        fullName: "Anna",
        usernameEmail: "anna@firma.pl",
        role: "admin",
        isActive: true,
        lastLoginAt: null,
        passwordHash: "SHOULD-NOT-LEAK",
      },
    ]);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    selectMock.mockReturnValue({ from });

    const rows = await PlatformTenantUserService.listCompanyUsers(7);
    expect(rows).toEqual([
      {
        id: 2,
        fullName: "Anna",
        usernameEmail: "anna@firma.pl",
        role: "admin",
        isActive: true,
        lastLoginAt: null,
      },
    ]);
    expect(rows[0]).not.toHaveProperty("passwordHash");
  });

  it("setUserActive last_admin — bez UPDATE", async () => {
    const limit = vi.fn().mockResolvedValue([
      {
        id: 5,
        fullName: "Admin",
        usernameEmail: "a@x.pl",
        role: "admin",
        isActive: true,
        passwordHash: "hash",
      },
    ]);
    const whereUser = vi.fn().mockReturnValue({ limit });
    const fromUser = vi.fn().mockReturnValue({ where: whereUser });

    const whereCount = vi.fn().mockResolvedValue([{ n: 1 }]);
    const fromCount = vi.fn().mockReturnValue({ where: whereCount });

    selectMock.mockReturnValueOnce({ from: fromUser }).mockReturnValueOnce({ from: fromCount });

    await expect(PlatformTenantUserService.setUserActive(1, 5, false, 99)).rejects.toThrow(
      "last_admin"
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("resetPassword obcej firmy — not_found, bez UPDATE", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const whereUser = vi.fn().mockReturnValue({ limit });
    const fromUser = vi.fn().mockReturnValue({ where: whereUser });
    selectMock.mockReturnValue({ from: fromUser });

    await expect(PlatformTenantUserService.resetPassword(1, 50, "new-hash", 99)).rejects.toThrow(
      "not_found"
    );
    expect(updateMock).not.toHaveBeenCalled();
  });
});
