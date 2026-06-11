import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AdminUserService } from "@/services/AdminUserService";
import { hashPassword } from "@/lib/passwordCrypto";
import { cleanupTestCompany, createTestCompany, uniqueTestSlug } from "@/test/integrationDb";

describe("AdminUserService (integracja z bazą)", () => {
  let companyId: number;
  let userId: number;
  const plainPassword = "Itest-haslo-123!";
  const login = `${uniqueTestSlug()}@itest.local`;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const passwordHash = await hashPassword(plainPassword);
    userId = await AdminUserService.createUser(companyId, {
      fullName: "__ITEST pracownik",
      usernameEmail: login,
      passwordHash,
      role: "worker",
      canCreateOwnOrders: true,
    });
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("tworzy użytkownika z zahashowanym hasłem (bcrypt) i poprawnymi polami", async () => {
    expect(userId).toBeGreaterThan(0);
    const user = await AdminUserService.getUserById(userId);
    expect(user).not.toBeNull();
    expect(user?.companyId).toBe(companyId);
    expect(user?.usernameEmail).toBe(login);
    expect(user?.role).toBe("worker");
    expect(user?.isActive).toBe(true);
    // Hash bcrypt — nigdy plaintext w bazie.
    expect(user?.passwordHash).not.toBe(plainPassword);
    expect(user?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("verifyPasswordForUserId akceptuje poprawne hasło", async () => {
    await expect(AdminUserService.verifyPasswordForUserId(userId, plainPassword)).resolves.toBe(
      true
    );
  });

  it("verifyPasswordForUserId odrzuca błędne hasło", async () => {
    await expect(AdminUserService.verifyPasswordForUserId(userId, "zle-haslo")).resolves.toBe(
      false
    );
  });

  it("verifyPasswordForUserId zwraca false dla nieistniejącego użytkownika", async () => {
    await expect(AdminUserService.verifyPasswordForUserId(-1, plainPassword)).resolves.toBe(false);
  });

  it("getUserByUsername znajduje login niezależnie od wielkości liter", async () => {
    const user = await AdminUserService.getUserByUsername(login.toUpperCase());
    expect(user?.id).toBe(userId);
  });

  it("odrzuca drugi rekord z tym samym loginem (unikalność username_email)", async () => {
    const passwordHash = await hashPassword("inne-haslo");
    await expect(
      AdminUserService.createUser(companyId, {
        fullName: "__ITEST duplikat",
        usernameEmail: login,
        passwordHash,
      })
    ).rejects.toThrow();
  });

  it("deaktywacja użytkownika przez updateUser ustawia isActive=false", async () => {
    const passwordHash = await hashPassword("haslo-deaktywacja");
    const deactivatedId = await AdminUserService.createUser(companyId, {
      fullName: "__ITEST do deaktywacji",
      usernameEmail: `${uniqueTestSlug()}@itest.local`,
      passwordHash,
    });

    await AdminUserService.updateUser(companyId, deactivatedId, { isActive: false });

    const user = await AdminUserService.getUserById(deactivatedId);
    expect(user?.isActive).toBe(false);
    // Hasło dalej weryfikowalne — deaktywacja nie niszczy hasha.
    await expect(
      AdminUserService.verifyPasswordForUserId(deactivatedId, "haslo-deaktywacja")
    ).resolves.toBe(true);
  });

  it("updateUser nie modyfikuje użytkownika spoza wskazanej firmy", async () => {
    const otherCompany = await createTestCompany();
    try {
      // Próba zmiany usera firmy A z kontekstem firmy B — warunek companyId blokuje update.
      await AdminUserService.updateUser(otherCompany.id, userId, { isActive: false });
      const user = await AdminUserService.getUserById(userId);
      expect(user?.isActive).toBe(true);
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });
});
