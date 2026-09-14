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
    expect(company.lifecycleStatus).toBe("active");
    expect(company.planKey).toBe("field_ops");
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
    expect(updated?.lifecycleStatus).toBe("suspended");

    const fetched = await PlatformCompanyService.getCompanyById(company.id);
    expect(fetched?.isActive).toBe(false);
    expect(fetched?.lifecycleStatus).toBe("suspended");
  });

  it("archiwizacja ustawia is_active=false i nie kasuje firmy", async () => {
    const slug = uniqueTestSlug();
    const company = await PlatformCompanyService.createCompany(`__ITEST archiwum ${slug}`, slug);
    createdCompanyIds.push(company.id);

    const archived = await PlatformCompanyService.updateCompany(company.id, {
      lifecycleStatus: "archived",
      internalNote: "  offboarding Q3  ",
    });
    expect(archived?.lifecycleStatus).toBe("archived");
    expect(archived?.isActive).toBe(false);
    expect(archived?.internalNote).toBe("offboarding Q3");

    const stillThere = await PlatformCompanyService.getCompanyById(company.id);
    expect(stillThere?.id).toBe(company.id);
    expect(stillThere?.slug).toBe(slug);
  });

  it("preset yard zapisuje DUR on, GPS off i plan_key", async () => {
    const { PlatformFeatureFlagService } = await import("@/services/PlatformFeatureFlagService");
    const { PLAN_PRESET_FLAGS } = await import("@/lib/companyLifecycle");
    const slug = uniqueTestSlug();
    const company = await PlatformCompanyService.createCompany(`__ITEST yard ${slug}`, slug);
    createdCompanyIds.push(company.id);

    const flags = await PlatformFeatureFlagService.updateFlags(company.id, PLAN_PRESET_FLAGS.yard);
    const updated = await PlatformCompanyService.updateCompany(company.id, { planKey: "yard" });

    expect(flags.durEnabled).toBe(true);
    expect(flags.gpsTrackingEnabled).toBe(false);
    expect(flags.mapViewEnabled).toBe(false);
    expect(flags.geofencingEnabled).toBe(false);
    expect(flags.routePlanningEnabled).toBe(false);
    expect(flags.navigationEnabled).toBe(false);
    expect(updated?.planKey).toBe("yard");
  });

  it("createCompanyAdmin na zarchiwizowanej firmie zwraca company_inactive", async () => {
    const slug = uniqueTestSlug();
    const company = await PlatformCompanyService.createCompany(`__ITEST noadmin ${slug}`, slug);
    createdCompanyIds.push(company.id);
    await PlatformCompanyService.updateCompany(company.id, { lifecycleStatus: "archived" });

    await expect(
      PlatformCompanyService.createCompanyAdmin(company.id, {
        fullName: "Nowy Admin",
        usernameEmail: `${uniqueTestSlug()}@itest.local`,
        passwordHash: "not-a-real-hash",
      })
    ).rejects.toThrow("company_inactive");
  });

  it("getCompanyById zwraca null dla nieistniejącej firmy", async () => {
    await expect(PlatformCompanyService.getCompanyById(-1)).resolves.toBeNull();
  });
});
