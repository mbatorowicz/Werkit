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
  sparePartInventory: { companyId: "companyId", partId: "partId", quantity: "quantity" },
  stockReceipts: { id: "id" },
  stockIssues: { id: "id" },
  spareParts: { id: "id", companyId: "companyId", name: "name", catalogNumber: "catalogNumber" },
  users: { id: "id", fullName: "fullName" },
  workOrders: { id: "id", taskDescription: "taskDescription", resourceId: "resourceId" },
  resources: { id: "id", name: "name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
}));

vi.mock("drizzle-orm/pg-core", () => ({
  alias: (table: unknown, name: string) => ({ table, name }),
}));

vi.mock("./InventoryService", () => ({
  InventoryService: {
    assertPartBelongsToCompany: vi.fn().mockResolvedValue(true),
    upsertQuantity: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("StockMovementService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    vi.clearAllMocks();
  });

  it("addReceipt odrzuca czesc spoza firmy przed insertem", async () => {
    const { InventoryService } = await import("./InventoryService");
    vi.mocked(InventoryService.assertPartBelongsToCompany).mockResolvedValue(false);

    const { StockMovementService } = await import("./StockMovementService");
    await expect(
      StockMovementService.addReceipt(1, 2, { partId: 99, quantity: "1" })
    ).rejects.toMatchObject({ code: "part_not_found" });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("addIssue odrzuca czesc spoza firmy przed sprawdzeniem stanu", async () => {
    const { InventoryService } = await import("./InventoryService");
    vi.mocked(InventoryService.assertPartBelongsToCompany).mockResolvedValue(false);

    const { StockMovementService } = await import("./StockMovementService");
    await expect(
      StockMovementService.addIssue(1, 2, { partId: 99, quantity: "1" })
    ).rejects.toMatchObject({ code: "part_not_found" });

    expect(selectMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });
});
