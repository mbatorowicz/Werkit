import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JwtPayload } from "@/lib/auth";

const getUserById = vi.fn();
const getCompanyById = vi.fn();

vi.mock("@/db", () => ({ db: {} }));

vi.mock("@/services/AdminUserService", () => ({
  AdminUserService: { getUserById: (...args: unknown[]) => getUserById(...args) },
}));

vi.mock("@/services/PlatformCompanyService", () => ({
  PlatformCompanyService: { getCompanyById: (...args: unknown[]) => getCompanyById(...args) },
}));

import { AuthPrincipalService } from "./AuthPrincipalService";

const jwt = (over: Partial<JwtPayload> = {}): JwtPayload => ({
  userId: 10,
  role: "admin",
  companyId: 1,
  ...over,
});

describe("AuthPrincipalService.resolve", () => {
  beforeEach(() => {
    getUserById.mockReset();
    getCompanyById.mockReset();
  });

  it("zwraca null gdy user nie istnieje", async () => {
    getUserById.mockResolvedValue(null);
    await expect(AuthPrincipalService.resolve(jwt())).resolves.toBeNull();
    expect(getCompanyById).not.toHaveBeenCalled();
  });

  it("zwraca null gdy user jest nieaktywny", async () => {
    getUserById.mockResolvedValue({
      id: 10,
      isActive: false,
      role: "admin",
      companyId: 1,
      fullName: "X",
    });
    await expect(AuthPrincipalService.resolve(jwt())).resolves.toBeNull();
  });

  it("zwraca null gdy firma nie istnieje albo jest nieaktywna", async () => {
    getUserById.mockResolvedValue({
      id: 10,
      isActive: true,
      role: "worker",
      companyId: 7,
      fullName: "Jan",
    });
    getCompanyById.mockResolvedValue(null);
    await expect(AuthPrincipalService.resolve(jwt({ companyId: 1 }))).resolves.toBeNull();

    getCompanyById.mockResolvedValue({ id: 7, isActive: false });
    await expect(AuthPrincipalService.resolve(jwt())).resolves.toBeNull();
  });

  it("nadpisuje rolę i companyId z DB (JWT może kłamać)", async () => {
    getUserById.mockResolvedValue({
      id: 10,
      isActive: true,
      role: "worker",
      companyId: 9,
      fullName: "Anna",
    });
    getCompanyById.mockResolvedValue({ id: 9, isActive: true });

    const principal = await AuthPrincipalService.resolve(
      jwt({ userId: 10, role: "admin", companyId: 1 })
    );
    expect(principal).toEqual({
      userId: 10,
      role: "worker",
      companyId: 9,
      fullName: "Anna",
    });
    expect(getCompanyById).toHaveBeenCalledWith(9);
  });

  it("superadmin bez firmy — pomija companies", async () => {
    getUserById.mockResolvedValue({
      id: 2,
      isActive: true,
      role: "superadmin",
      companyId: null,
      fullName: "Platform",
    });
    const principal = await AuthPrincipalService.resolve({
      userId: 2,
      role: "superadmin",
      companyId: null,
    });
    expect(principal).toEqual({
      userId: 2,
      role: "superadmin",
      companyId: null,
      fullName: "Platform",
    });
    expect(getCompanyById).not.toHaveBeenCalled();
  });

  describe("impersonacja", () => {
    const actor = {
      id: 2,
      isActive: true,
      role: "superadmin",
      companyId: null,
      fullName: "Platform",
    };
    const targetAdmin = {
      id: 10,
      isActive: true,
      role: "admin",
      companyId: 7,
      fullName: "Anna",
    };

    function mockUsers(map: Record<number, typeof actor | typeof targetAdmin | null>) {
      getUserById.mockImplementation(async (id: unknown) => map[Number(id)] ?? null);
    }

    it("brak aktora superadmin → null", async () => {
      mockUsers({
        2: { ...actor, role: "admin", companyId: 1 },
        10: targetAdmin,
      });
      await expect(
        AuthPrincipalService.resolve(
          jwt({ userId: 10, role: "admin", companyId: 7, impersonatorUserId: 2 })
        )
      ).resolves.toBeNull();
      expect(getCompanyById).not.toHaveBeenCalled();
    });

    it("nieaktywny aktor → null", async () => {
      mockUsers({ 2: { ...actor, isActive: false }, 10: targetAdmin });
      await expect(
        AuthPrincipalService.resolve(
          jwt({ userId: 10, role: "admin", companyId: 7, impersonatorUserId: 2 })
        )
      ).resolves.toBeNull();
    });

    it("firma celu nieaktywna → null", async () => {
      mockUsers({ 2: actor, 10: targetAdmin });
      getCompanyById.mockResolvedValue({ id: 7, isActive: false });
      await expect(
        AuthPrincipalService.resolve(
          jwt({ userId: 10, role: "admin", companyId: 7, impersonatorUserId: 2 })
        )
      ).resolves.toBeNull();
    });

    it("cel worker → null", async () => {
      mockUsers({
        2: actor,
        10: { ...targetAdmin, role: "worker" },
      });
      getCompanyById.mockResolvedValue({ id: 7, isActive: true });
      await expect(
        AuthPrincipalService.resolve(
          jwt({ userId: 10, role: "admin", companyId: 7, impersonatorUserId: 2 })
        )
      ).resolves.toBeNull();
    });

    it("companyId JWT ≠ firma celu → null", async () => {
      mockUsers({ 2: actor, 10: targetAdmin });
      getCompanyById.mockResolvedValue({ id: 7, isActive: true });
      await expect(
        AuthPrincipalService.resolve(
          jwt({ userId: 10, role: "admin", companyId: 99, impersonatorUserId: 2 })
        )
      ).resolves.toBeNull();
    });

    it("zwraca principal celu z impersonatorUserId", async () => {
      mockUsers({ 2: actor, 10: targetAdmin });
      getCompanyById.mockResolvedValue({ id: 7, isActive: true });
      await expect(
        AuthPrincipalService.resolve(
          jwt({ userId: 10, role: "viewer", companyId: 7, impersonatorUserId: 2 })
        )
      ).resolves.toEqual({
        userId: 10,
        role: "admin",
        companyId: 7,
        fullName: "Anna",
        impersonatorUserId: 2,
      });
    });
  });
});
