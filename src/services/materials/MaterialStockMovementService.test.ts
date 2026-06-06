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
  materials: { id: "id", name: "name" },
  users: { id: "id", fullName: "fullName" },
  workOrders: { id: "id", taskDescription: "taskDescription" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_c: unknown, v: unknown) => v,
  and: (...args: unknown[]) => args,
  desc: (c: unknown) => c,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

vi.mock("./MaterialInventoryService", () => ({
  MaterialInventoryService: {
    upsertQuantity: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("MaterialStockMovementService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
  });

  it("addIssue rzuca insufficient_stock gdy brak stanu", async () => {
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
});
