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
  materialInventory: {
    companyId: "companyId",
    materialId: "materialId",
    quantity: "quantity",
    updatedAt: "updatedAt",
  },
  materials: { id: "id", companyId: "companyId", name: "name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

describe("MaterialInventoryService", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
  });

  it("setQuantity odrzuca material spoza firmy przed zapisem", async () => {
    const selectChain = {
      from: vi.fn(() => selectChain),
      where: vi.fn(() => selectChain),
      limit: vi.fn(() => Promise.resolve([])),
    };
    selectMock.mockReturnValue(selectChain);

    const { MaterialInventoryService } = await import("./MaterialInventoryService");
    await expect(MaterialInventoryService.setQuantity(1, 99, "5")).rejects.toMatchObject({
      code: "material_not_found",
    });

    expect(insertMock).not.toHaveBeenCalled();
  });
});
