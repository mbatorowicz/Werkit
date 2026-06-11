import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CustomerLocationService } from "@/services/CustomerLocationService";
import { TenantContextError } from "@/lib/tenantContext";
import { cleanupTestCompany, createTestCompany, createTestCustomer } from "@/test/integrationDb";

describe("CustomerLocationService (integracja z bazą)", () => {
  let companyId: number;
  let customerId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    const customer = await createTestCustomer(companyId);
    customerId = customer.id;
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("dodaje lokalizację klienta i zwraca ją na liście", async () => {
    const created = await CustomerLocationService.createLocation({
      customerId,
      companyId,
      label: "Magazyn",
      address: "ul. Testowa 1",
      latitude: "52.2296760",
      longitude: "21.0122290",
      isDefault: true,
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.customerId).toBe(customerId);
    expect(created.isDefault).toBe(true);
    expect(Number(created.latitude)).toBeCloseTo(52.229676, 5);
    expect(Number(created.longitude)).toBeCloseTo(21.012229, 5);

    const list = await CustomerLocationService.listByCustomerId(customerId, companyId);
    expect(list.some((l) => l.id === created.id)).toBe(true);
  });

  it("getDefaultForCustomer zwraca lokalizację domyślną", async () => {
    const def = await CustomerLocationService.getDefaultForCustomer(customerId, companyId);
    expect(def).not.toBeNull();
    expect(def?.isDefault).toBe(true);
    expect(def?.label).toBe("Magazyn");
  });

  it("nowa lokalizacja z isDefault przejmuje flagę domyślną (tylko jedna domyślna)", async () => {
    const second = await CustomerLocationService.createLocation({
      customerId,
      companyId,
      label: "Plac budowy",
      latitude: "50.0646500",
      longitude: "19.9449800",
      isDefault: true,
    });
    expect(second.isDefault).toBe(true);

    const list = await CustomerLocationService.listByCustomerId(customerId, companyId);
    const defaults = list.filter((l) => l.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(second.id);
    // Lista sortowana: domyślna na początku.
    expect(list[0].id).toBe(second.id);
  });

  it("lokalizacja bez isDefault nie zmienia domyślnej", async () => {
    const extra = await CustomerLocationService.createLocation({
      customerId,
      companyId,
      label: "Punkt dodatkowy",
      latitude: "51.1078900",
      longitude: "17.0385300",
    });
    expect(extra.isDefault).toBe(false);

    const def = await CustomerLocationService.getDefaultForCustomer(customerId, companyId);
    expect(def?.label).toBe("Plac budowy");
  });

  it("po usunięciu domyślnej lokalizacji inna przejmuje flagę domyślną", async () => {
    const customer = await createTestCustomer(companyId);
    const first = await CustomerLocationService.createLocation({
      customerId: customer.id,
      companyId,
      label: "Pierwsza",
      latitude: "54.3520500",
      longitude: "18.6463700",
      isDefault: true,
    });
    await CustomerLocationService.createLocation({
      customerId: customer.id,
      companyId,
      label: "Druga",
      latitude: "53.1324800",
      longitude: "23.1688400",
    });

    await CustomerLocationService.deleteLocation(first.id, companyId);

    const remaining = await CustomerLocationService.listByCustomerId(customer.id, companyId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].label).toBe("Druga");
    expect(remaining[0].isDefault).toBe(true);
  });

  it("odrzuca operacje na kliencie innej firmy (cross_tenant)", async () => {
    const otherCompany = await createTestCompany();
    try {
      const foreignCustomer = await createTestCustomer(otherCompany.id);
      await expect(
        CustomerLocationService.createLocation({
          customerId: foreignCustomer.id,
          companyId,
          label: "Nielegalna",
          latitude: "52.0000000",
          longitude: "21.0000000",
        })
      ).rejects.toThrow(TenantContextError);
      await expect(
        CustomerLocationService.listByCustomerId(foreignCustomer.id, companyId)
      ).rejects.toThrow("nie należy do tej firmy");
    } finally {
      await cleanupTestCompany(otherCompany.id);
    }
  });
});
