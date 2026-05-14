import { describe, expect, it } from "vitest";
import { isRecord, narrowBaseCategories, narrowBaseWorkers } from "@/lib/narrowApiListRows";

describe("isRecord", () => {
  it("odrzuca null i prymitywy", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord("x")).toBe(false);
    expect(isRecord(1)).toBe(false);
  });

  it("odrzuca tablice (API zwraca obiekty wierszy, nie tablice zagnieżdżone)", () => {
    expect(isRecord([])).toBe(false);
  });

  it("akceptuje zwykły obiekt rekordu", () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });
});

describe("narrowBaseWorkers", () => {
  it("zwraca tylko wiersze z id: number i fullName: string", () => {
    const out = narrowBaseWorkers([
      { id: 1, fullName: "Jan" },
      { id: "2", fullName: "Zły" },
      { id: 3, fullName: 404 },
      null,
    ]);
    expect(out).toEqual([{ id: 1, fullName: "Jan" }]);
  });
});

describe("narrowBaseCategories", () => {
  it("uzupełnia domyślne boole i pomija niepoprawne wiersze", () => {
    const out = narrowBaseCategories([
      {
        id: 10,
        name: "Transport",
        showCustomer: false,
        reqTaskDescription: false,
      },
      { id: "x", name: "Zły" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: 10,
      name: "Transport",
      showCustomer: false,
      showMaterial: true,
      reqCustomer: false,
      isStationary: false,
    });
  });
});
