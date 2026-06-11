import { describe, expect, it, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}));

vi.mock("@/db/schema", () => ({
  materialInventory: { companyId: "companyId", materialId: "materialId", quantity: "quantity" },
  materialStockReceipts: { id: "id" },
  materialStockIssues: { id: "id" },
  materials: { id: "id", companyId: "companyId", name: "name" },
  users: { id: "id", fullName: "fullName" },
  workOrders: { id: "id", taskDescription: "taskDescription", customerId: "customerId" },
  workSessions: { id: "id", customerId: "customerId" },
  customers: { id: "id", firstName: "firstName", lastName: "lastName" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_c: unknown, v: unknown) => v,
  and: (...args: unknown[]) => args,
  desc: (c: unknown) => c,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

vi.mock("drizzle-orm/pg-core", () => ({
  alias: (table: unknown, name: string) => ({ table, name }),
}));

vi.mock("./MaterialInventoryService", () => ({
  MaterialInventoryService: {
    assertMaterialBelongsToCompany: vi.fn().mockResolvedValue(true),
    upsertQuantity: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("MaterialStockMovementService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    vi.clearAllMocks();
  });

  it("addIssue rzuca insufficient_stock gdy brak stanu", async () => {
    const { MaterialInventoryService } = await import("./MaterialInventoryService");
    vi.mocked(MaterialInventoryService.assertMaterialBelongsToCompany).mockResolvedValue(true);
    const chain = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      limit: vi.fn(() => Promise.resolve([])),
    };
    selectMock.mockReturnValue(chain);

    const { MaterialStockMovementService } = await import("./MaterialStockMovementService");
    await expect(
      MaterialStockMovementService.addIssue(1, 2, { materialId: 5, quantity: "10" })
    ).rejects.toMatchObject({ code: "insufficient_stock" });
  });

  it("addReceipt odrzuca material spoza firmy przed insertem", async () => {
    const { MaterialInventoryService } = await import("./MaterialInventoryService");
    vi.mocked(MaterialInventoryService.assertMaterialBelongsToCompany).mockResolvedValue(false);

    const { MaterialStockMovementService } = await import("./MaterialStockMovementService");
    await expect(
      MaterialStockMovementService.addReceipt(1, 2, { materialId: 99, quantity: "1" })
    ).rejects.toMatchObject({ code: "material_not_found" });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("addIssue odrzuca material spoza firmy przed sprawdzeniem stanu", async () => {
    const { MaterialInventoryService } = await import("./MaterialInventoryService");
    vi.mocked(MaterialInventoryService.assertMaterialBelongsToCompany).mockResolvedValue(false);

    const { MaterialStockMovementService } = await import("./MaterialStockMovementService");
    await expect(
      MaterialStockMovementService.addIssue(1, 2, { materialId: 99, quantity: "1" })
    ).rejects.toMatchObject({ code: "material_not_found" });

    expect(selectMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });
});
