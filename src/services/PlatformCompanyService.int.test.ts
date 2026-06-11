import { afterAll, describe, expect, it } from "vitest";
import { PlatformCompanyService } from "@/services/PlatformCompanyService";
import { AdminUserService } from "@/services/AdminUserService";
import { hashPassword } from "@/lib/passwordCrypto";
import { cleanupTestCompany, uniqueTestSlug } from "@/test/integrationDb";

/**
 * Firmy tworzone bezpośrednio przez serwis platformowy — rejestrujemy ich id,
 * żeby afterAll posprzątał wszystko niezależnie od wyniku testów.
 * Asercje na listach platformowych WYŁĄCZNIE przez filtrowanie po własnych id/slugach
 * (baza testowa zawiera cudze dane).
 */
const createdCompanyIds: number[] = [];

describe("PlatformCompanyService (integracja z bazą)", () => {
  afterAll(async () => {
    for (const id of createdCompanyIds) {
      await cleanupTestCompany(id);
    }
  });

  it("tworzy firmę z jawnym slugiem i ustawia isActive", async () => {
    const slug = uniqueTestSlug();
    const company = await PlatformCompanyService.createCompany(`__ITEST firma ${slug}`, slug);
    createdCompanyIds.push(company.id);

    expect(company.id).toBeGreaterThan(0);
    expect(company.slug).toBe(slug);
    expect(company.name).toBe(`__ITEST firma ${slug}`);
    expect(company.isActive).toBe(true);
  });

  it("bez sluga generuje slug z nazwy (slugify, polskie znaki diakrytyczne)", async () => {
    const unique = uniqueTestSlug();
    const company = await PlatformCompanyService.createCompany(
      `__ITEST Świeża Żwirownia ${unique}`
    );
    createdCompanyIds.push(company.id);

    expect(company.slug).toBe(`itest-swieza-zwirownia-${unique}`);
  });

  it("odrzuca pustą nazwę (missing_name)", async () => {
    await expect(PlatformCompanyService.createCompany("   ")).rejects.toThrow("missing_name");
  });

  it("odrzuca duplikat sluga (unikalność companies.slug)", async () => {
    const slug = uniqueTestSlug();
    const company = await PlatformCompanyService.createCompany(`__ITEST firma ${slug}`, slug);
    createdCompanyIds.push(company.id);

    // mapCreateError musi rozpoznać PRAWDZIWY błąd z Drizzle (kod 23505 w łańcuchu `cause`).
    let drizzleError: unknown = null;
    try {
      await PlatformCompanyService.createCompany(`__ITEST duplikat ${slug}`, slug);
    } catch (err) {
      drizzleError = err;
    }
    expect(drizzleError).not.toBeNull();
    expect(PlatformCompanyService.mapCreateError(drizzleError)).toBe("slug_exists");

    // Surowy błąd pg (bez opakowania) nadal rozpoznawany; nie-unikalność → null.
    const rawPgError = Object.assign(
      new Error('duplicate key value violates unique constraint "companies_slug_unique"'),
      { code: "23505" }
    );
    expect(PlatformCompanyService.mapCreateError(rawPgError)).toBe("slug_exists");
    expect(PlatformCompanyService.mapCreateError(new Error("inny błąd"))).toBeNull();
  });

  it("listCompanies zawiera wszystkie własne firmy testowe", async () => {
    const all = await PlatformCompanyService.listCompanies();
    const ownIds = new Set(createdCompanyIds);
    const own = all.filter((c) => ownIds.has(c.id));
    expect(own).toHaveLength(createdCompanyIds.length);
    expect(own.every((c) => c.name.startsWith("__ITEST"))).toBe(true);
  });

  it("createCompanyWithAdmin tworzy firmę razem z kontem admina", async () => {
    const slug = uniqueTestSlug();
    const adminEmail = `${uniqueTestSlug()}@itest.local`;
    const passwordHash = await hashPassword("Itest-admin-123!");
    const company = await PlatformCompanyService.createCompanyWithAdmin(
      `__ITEST firma admin ${slug}`,
      slug,
      { fullName: "__ITEST Admin", usernameEmail: adminEmail, passwordHash }
    );
    createdCompanyIds.push(company.id);

    const companyUsers = await AdminUserService.getAllUsers(company.id);
    expect(companyUsers).toHaveLength(1);
    expect(companyUsers[0].usernameEmail).toBe(adminEmail);
    expect(companyUsers[0].role).toBe("admin");
  });

  it("updateCompany zmienia nazwę i status aktywności", async () => {
    const slug = uniqueTestSlug();
    const company = await PlatformCompanyService.createCompany(`__ITEST do edycji ${slug}`, slug);
    createdCompanyIds.push(company.id);

    const updated = await PlatformCompanyService.updateCompany(company.id, {
      name: `__ITEST po edycji ${slug}`,
      isActive: false,
    });
    expect(updated?.name).toBe(`__ITEST po edycji ${slug}`);
    expect(updated?.isActive).toBe(false);

    const fetched = await PlatformCompanyService.getCompanyById(company.id);
    expect(fetched?.isActive).toBe(false);
  });

  it("getCompanyById zwraca null dla nieistniejącej firmy", async () => {
    await expect(PlatformCompanyService.getCompanyById(-1)).resolves.toBeNull();
  });
});
