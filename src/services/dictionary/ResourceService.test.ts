import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, insertMock, updateMock, deleteMock, assertResourceGroupsAssignable } =
  vi.hoisted(() => ({
    selectMock: vi.fn(),
    insertMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
    assertResourceGroupsAssignable: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

vi.mock("@/db/schema", () => ({
  resources: {
    id: "id",
    companyId: "companyId",
    resourceGroupId: "resourceGroupId",
  },
  resourceToCategories: {
    resourceId: "resourceId",
    categoryId: "categoryId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: unknown) => val,
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
  inArray: (col: unknown, vals: unknown) => ({ col, vals }),
}));

vi.mock("@/services/categoryHierarchyValidation", () => ({
  assertResourceCategoryAssignable: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/dur/categoryValidation", () => ({
  assertResourceGroupsAssignable,
  CategoryHierarchyError: class extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  },
}));

import { ResourceService } from "./ResourceService";
import { CategoryHierarchyError } from "@/services/dur/categoryValidation";

function resultArray<T>(items: T[]): T[] & Promise<T[]> {
  const promise = Promise.resolve(items);
  const arr = items.slice() as T[] & Promise<T[]>;
  arr.then = promise.then.bind(promise);
  arr.catch = promise.catch.bind(promise);
  return arr;
}

describe("ResourceService — tenant resourceGroupId", () => {
  beforeEach(() => {
    selectMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    assertResourceGroupsAssignable.mockReset();
    assertResourceGroupsAssignable.mockResolvedValue(undefined);
  });

  it("odrzuca grupę maszyn innej firmy przy dodawaniu zasobu", async () => {
    assertResourceGroupsAssignable.mockRejectedValue(
      new CategoryHierarchyError("invalid_resource_group")
    );

    await expect(
      ResourceService.addResource(
        1,
        { name: "Koparka", brand: "", model: "", registrationNumber: "" },
        [],
        null,
        99
      )
    ).rejects.toThrow(/invalid_resource_group/);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("odrzuca grupę maszyn innej firmy przy aktualizacji zasobu", async () => {
    assertResourceGroupsAssignable.mockRejectedValue(
      new CategoryHierarchyError("invalid_resource_group")
    );

    await expect(ResourceService.updateResource(1, 10, { resourceGroupId: 99 })).rejects.toThrow(
      /invalid_resource_group/
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("nie asertuje grupy gdy resourceGroupId jest null", async () => {
    insertMock.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => resultArray([{ id: 1 }])),
      })),
    });

    await ResourceService.addResource(
      1,
      { name: "Koparka", brand: "", model: "", registrationNumber: "" },
      [],
      null,
      null
    );

    expect(assertResourceGroupsAssignable).not.toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});

describe("ResourceService.getResources", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("ładuje resource_to_categories tylko dla ID maszyn firmy", async () => {
    const resourceRow = {
      id: 10,
      name: "Koparka",
      brand: "",
      model: "",
      registrationNumber: "",
      description: null,
      resourceGroupId: null,
      imageUrl: null,
    };
    const resourceChain = {
      from: vi.fn(() => resourceChain),
      where: vi.fn(() => resourceChain),
      orderBy: vi.fn(() => resultArray([resourceRow])),
    };
    const linksChain = {
      from: vi.fn(() => linksChain),
      where: vi.fn(() => resultArray([{ resourceId: 10, categoryId: 3 }])),
    };
    selectMock.mockReturnValueOnce(resourceChain).mockReturnValueOnce(linksChain);

    const result = await ResourceService.getResources(1);
    expect(result).toEqual([
      {
        id: 10,
        name: "Koparka",
        brand: "",
        model: "",
        registrationNumber: "",
        description: null,
        categoryIds: [3],
        resourceGroupId: null,
        imageUrl: null,
      },
    ]);
    expect(linksChain.where).toHaveBeenCalledWith({ col: "resourceId", vals: [10] });
  });

  it("przy pustej liście maszyn nie skanuje resource_to_categories", async () => {
    const resourceChain = {
      from: vi.fn(() => resourceChain),
      where: vi.fn(() => resourceChain),
      orderBy: vi.fn(() => resultArray([])),
    };
    selectMock.mockReturnValueOnce(resourceChain);

    const result = await ResourceService.getResources(1);
    expect(result).toEqual([]);
    expect(selectMock).toHaveBeenCalledTimes(1);
  });
});
