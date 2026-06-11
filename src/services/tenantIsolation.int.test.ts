import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { workOrders } from "@/db/schema";
import { AdminUserService } from "@/services/AdminUserService";
import { CategoryService } from "@/services/dictionary/CategoryService";
import { CustomerService } from "@/services/dictionary/CustomerService";
import { MaterialService } from "@/services/dictionary/MaterialService";
import { WorkerOrderService } from "@/services/WorkerOrderService";
import {
  cleanupTestCompany,
  createTestCategory,
  createTestCompany,
  createTestCustomer,
  createTestMaterial,
  createTestResource,
  createTestUser,
  uniqueTestSlug,
} from "@/test/integrationDb";

/** Dane jednej firmy testowej — komplet rekordów do sprawdzania izolacji. */
type TenantFixture = {
  companyId: number;
  userId: number;
  categoryId: number;
  customerId: number;
  materialId: number;
  resourceId: number;
  orderId: number;
};

/** Zlecenie PENDING wstawiane wprost (tylko we własnej firmie testowej). */
async function createPendingOrder(fixture: {
  companyId: number;
  userId: number;
  resourceId: number;
  categoryId: number;
}): Promise<number> {
  const [row] = await db
    .insert(workOrders)
    .values({
      companyId: fixture.companyId,
      userId: fixture.userId,
      resourceId: fixture.resourceId,
      categoryId: fixture.categoryId,
      taskDescription: `__ITEST zlecenie ${uniqueTestSlug()}`,
      status: "PENDING",
      priority: "NORMAL",
    })
    .returning({ id: workOrders.id });
  return row.id;
}

async function createTenantFixture(): Promise<TenantFixture> {
  const company = await createTestCompany();
  const [user, category, customer, material, resource] = await Promise.all([
    createTestUser(company.id),
    createTestCategory(company.id),
    createTestCustomer(company.id),
    createTestMaterial(company.id),
    createTestResource(company.id),
  ]);
  const orderId = await createPendingOrder({
    companyId: company.id,
    userId: user.id,
    resourceId: resource.id,
    categoryId: category.id,
  });
  return {
    companyId: company.id,
    userId: user.id,
    categoryId: category.id,
    customerId: customer.id,
    materialId: material.id,
    resourceId: resource.id,
    orderId,
  };
}

describe("Izolacja multi-tenant serwisów listujących (integracja z bazą)", () => {
  let tenantA: TenantFixture;
  let tenantB: TenantFixture;

  beforeAll(async () => {
    tenantA = await createTenantFixture();
    tenantB = await createTenantFixture();
  });

  afterAll(async () => {
    await cleanupTestCompany(tenantA.companyId);
    await cleanupTestCompany(tenantB.companyId);
  });

  it("AdminUserService.getAllUsers nie zwraca użytkowników drugiej firmy", async () => {
    const usersA = await AdminUserService.getAllUsers(tenantA.companyId);
    expect(usersA.some((u) => u.id === tenantA.userId)).toBe(true);
    expect(usersA.some((u) => u.id === tenantB.userId)).toBe(false);
    expect(usersA.every((u) => u.companyId === tenantA.companyId)).toBe(true);
  });

  it("CategoryService.getCategories nie zwraca kategorii drugiej firmy (także leavesOnly)", async () => {
    const categoriesA = await CategoryService.getCategories(tenantA.companyId);
    expect(categoriesA.some((c) => c.id === tenantA.categoryId)).toBe(true);
    expect(categoriesA.some((c) => c.id === tenantB.categoryId)).toBe(false);

    const leavesA = await CategoryService.getCategories(tenantA.companyId, { leavesOnly: true });
    expect(leavesA.some((c) => c.id === tenantB.categoryId)).toBe(false);

    // Kategoria drugiej firmy nie jest też dostępna punktowo.
    await expect(
      CategoryService.getResourceCategoryById(tenantA.companyId, tenantB.categoryId)
    ).resolves.toBeNull();
  });

  it("CustomerService.getCustomers nie zwraca klientów drugiej firmy", async () => {
    const customersA = await CustomerService.getCustomers(tenantA.companyId);
    expect(customersA.some((c) => c.id === tenantA.customerId)).toBe(true);
    expect(customersA.some((c) => c.id === tenantB.customerId)).toBe(false);
    expect(customersA.every((c) => c.companyId === tenantA.companyId)).toBe(true);
  });

  it("MaterialService.getMaterials nie zwraca materiałów drugiej firmy", async () => {
    const materialsA = await MaterialService.getMaterials(tenantA.companyId);
    expect(materialsA.some((m) => m.id === tenantA.materialId)).toBe(true);
    expect(materialsA.some((m) => m.id === tenantB.materialId)).toBe(false);
  });

  it("WorkerOrderService.getPendingOrders nie zwraca zleceń drugiej firmy", async () => {
    const ordersA = await WorkerOrderService.getPendingOrders(tenantA.userId, tenantA.companyId);
    expect(ordersA.some((o) => o.id === tenantA.orderId)).toBe(true);
    expect(ordersA.some((o) => o.id === tenantB.orderId)).toBe(false);

    // Użytkownik firmy A w kontekście firmy B nie widzi niczego.
    const crossContext = await WorkerOrderService.getPendingOrders(
      tenantA.userId,
      tenantB.companyId
    );
    expect(crossContext).toHaveLength(0);
  });

  it("kategoria nie może wskazać rodzica z innej firmy (invalid_parent)", async () => {
    const foreignGroup = await createTestCategory(tenantB.companyId, { isGroup: true });
    await expect(
      CategoryService.addCategory(tenantA.companyId, {
        name: `__ITEST cross-tenant ${uniqueTestSlug()}`,
        parentId: foreignGroup.id,
      })
    ).rejects.toThrow("invalid_parent");
  });
});
