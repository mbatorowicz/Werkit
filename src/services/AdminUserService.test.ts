import { describe, expect, it, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

vi.mock("@/db/schema", () => ({
  users: {
    id: "id",
    fullName: "fullName",
    usernameEmail: "usernameEmail",
    role: "role",
    isActive: "isActive",
    canCreateOwnOrders: "canCreateOwnOrders",
    canEditRoute: "canEditRoute",
    canCreateCustomers: "canCreateCustomers",
    companyId: "companyId",
    passwordHash: "passwordHash",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  desc: (col: unknown) => col,
  and: (...args: unknown[]) => args,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

vi.mock("@/lib/passwordCrypto", () => ({
  comparePassword: vi.fn(
    (plain: string, hash: string) => plain === "correct-password" && hash === "hashed-value"
  ),
}));

describe("AdminUserService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
  });

  describe("getAllUsers", () => {
    it("zwraca listę użytkowników dla companyId z projekcją kolumn", async () => {
      const orderBy = vi
        .fn()
        .mockResolvedValue([
          {
            id: 1,
            fullName: "Jan Kowalski",
            usernameEmail: "jan@test.pl",
            role: "worker",
            isActive: true,
            canCreateOwnOrders: true,
            canEditRoute: false,
            canCreateCustomers: false,
            companyId: 1,
          },
        ]);
      const where = vi.fn().mockReturnValue({ orderBy });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      const result = await AdminUserService.getAllUsers(1);

      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe("Jan Kowalski");
      expect(result[0]).not.toHaveProperty("passwordHash");
    });
  });

  describe("getUserById", () => {
    it("zwraca użytkownika gdy istnieje", async () => {
      const limit = vi.fn().mockResolvedValue([{ id: 1, fullName: "Jan" }]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      const result = await AdminUserService.getUserById(1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
    });

    it("zwraca null gdy brak użytkownika", async () => {
      const limit = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      const result = await AdminUserService.getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe("getUserByIdForCompany", () => {
    it("zwraca użytkownika gdy należy do firmy", async () => {
      const limit = vi.fn().mockResolvedValue([{ id: 1, companyId: 1 }]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      const result = await AdminUserService.getUserByIdForCompany(1, 1);

      expect(result).not.toBeNull();
    });

    it("zwraca null gdy użytkownik nie należy do firmy", async () => {
      const limit = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      const result = await AdminUserService.getUserByIdForCompany(1, 999);

      expect(result).toBeNull();
    });
  });

  describe("getUserByUsername", () => {
    it("zwraca użytkownika po username (case-insensitive)", async () => {
      const limit = vi.fn().mockResolvedValue([{ id: 1, usernameEmail: "jan@test.pl" }]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      const result = await AdminUserService.getUserByUsername("JAN@TEST.PL");

      expect(result).not.toBeNull();
      expect(result!.usernameEmail).toBe("jan@test.pl");
    });
  });

  describe("getWorkers", () => {
    it("zwraca tylko pracowników (role=worker)", async () => {
      const where = vi.fn().mockResolvedValue([
        { id: 1, fullName: "Worker 1" },
        { id: 2, fullName: "Worker 2" },
      ]);
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      const result = await AdminUserService.getWorkers(1);

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty("passwordHash");
    });
  });

  describe("createUser", () => {
    it("tworzy użytkownika z domyślnymi flagami dla roli worker", async () => {
      const returningMock = vi.fn().mockResolvedValue([{ id: 42 }]);
      const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
      insertMock.mockReturnValue({ values: valuesMock });

      const { AdminUserService } = await import("./AdminUserService");
      const id = await AdminUserService.createUser(1, {
        fullName: "Nowy Pracownik",
        usernameEmail: "nowy@test.pl",
        passwordHash: "hash123",
        role: "worker",
      });

      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "worker",
          canCreateOwnOrders: true,
          canEditRoute: false,
          canCreateCustomers: false,
        })
      );
      expect(id).toBe(42);
    });

    it("tworzy admina bez flag worker", async () => {
      const returningMock = vi.fn().mockResolvedValue([{ id: 7 }]);
      const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
      insertMock.mockReturnValue({ values: valuesMock });

      const { AdminUserService } = await import("./AdminUserService");
      await AdminUserService.createUser(1, {
        fullName: "Admin",
        usernameEmail: "admin@test.pl",
        passwordHash: "hash456",
        role: "admin",
      });

      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "admin",
          canCreateOwnOrders: false,
          canEditRoute: false,
          canCreateCustomers: false,
        })
      );
    });
  });

  describe("updateUser", () => {
    it("aktualizuje użytkownika bez zmiany companyId", async () => {
      const where = vi.fn().mockResolvedValue(undefined);
      const set = vi.fn().mockReturnValue({ where });
      updateMock.mockReturnValue({ set });

      const { AdminUserService } = await import("./AdminUserService");
      await AdminUserService.updateUser(1, 1, { fullName: "Nowe Imię", companyId: 999 });

      // companyId powinno być usunięte z updates
      expect(set).toHaveBeenCalledWith(expect.not.objectContaining({ companyId: 999 }));
    });
  });

  describe("userCanEditRoute", () => {
    it("zwraca true gdy użytkownik ma canEditRoute", async () => {
      const limit = vi.fn().mockResolvedValue([{ canEditRoute: true }]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      await expect(AdminUserService.userCanEditRoute(42)).resolves.toBe(true);
    });

    it("zwraca false gdy brak rekordu lub flaga wyłączona", async () => {
      const limit = vi.fn().mockResolvedValue([{ canEditRoute: false }]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      await expect(AdminUserService.userCanEditRoute(7)).resolves.toBe(false);
    });

    it("zwraca false gdy brak wiersza", async () => {
      const limit = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      await expect(AdminUserService.userCanEditRoute(999)).resolves.toBe(false);
    });
  });

  describe("verifyPasswordForUserId", () => {
    it("zwraca true gdy hasło się zgadza", async () => {
      const limit = vi.fn().mockResolvedValue([{ passwordHash: "hashed-value" }]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      await expect(AdminUserService.verifyPasswordForUserId(1, "correct-password")).resolves.toBe(
        true
      );
    });

    it("zwraca false gdy hasło niepoprawne", async () => {
      const limit = vi.fn().mockResolvedValue([{ passwordHash: "hashed-value" }]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      await expect(AdminUserService.verifyPasswordForUserId(1, "wrong-password")).resolves.toBe(
        false
      );
    });

    it("zwraca false gdy brak użytkownika", async () => {
      const limit = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where });
      selectMock.mockReturnValue({ from });

      const { AdminUserService } = await import("./AdminUserService");
      await expect(AdminUserService.verifyPasswordForUserId(999, "any")).resolves.toBe(false);
    });
  });

  describe("deleteUser", () => {
    it("usuwa użytkownika w obrębie firmy", async () => {
      const where = vi.fn().mockResolvedValue(undefined);
      deleteMock.mockReturnValue({ where });

      const { AdminUserService } = await import("./AdminUserService");
      await AdminUserService.deleteUser(1, 5);

      expect(deleteMock).toHaveBeenCalledTimes(1);
    });
  });
});
