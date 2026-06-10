import { describe, expect, it } from "vitest";
import {
  parseDispatchArchiveResponse,
  parseDispatchDictionariesResponse,
  parseDispatchLiveResponse,
} from "./useOrdersDispatchData";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("dispatch response parsers", () => {
  it("nie traktuje błędu live API jako pustej poprawnej tablicy", async () => {
    const payload = await parseDispatchLiveResponse(
      jsonResponse({ error: "fetch_error" }, 500)
    );

    expect(payload).toBeNull();
  });

  it("odrzuca niepełny payload live, żeby nie wyczyścić bieżącego stanu", async () => {
    const payload = await parseDispatchLiveResponse(jsonResponse({ orders: [] }));

    expect(payload).toBeNull();
  });

  it("parsuje poprawny payload live i zawęża nieprawidłowe wiersze", async () => {
    const payload = await parseDispatchLiveResponse(
      jsonResponse({
        orders: [{ _type: "ORDER", id: 1 }, { _type: "ORDER", id: "bad" }],
        liveSessions: [{ _type: "SESSION", id: 2 }, null],
      })
    );

    expect(payload).toEqual({
      orders: [{ _type: "ORDER", id: 1 }],
      liveSessions: [{ _type: "SESSION", id: 2 }],
    });
  });

  it("nie czyści archiwum po błędzie lub nie-tablicowej odpowiedzi", async () => {
    await expect(
      parseDispatchArchiveResponse(jsonResponse({ error: "fetch_error" }, 500))
    ).resolves.toBeNull();
    await expect(parseDispatchArchiveResponse(jsonResponse({ data: [] }))).resolves.toBeNull();
  });

  it("odrzuca niepełny payload słowników, żeby zachować ostatnie poprawne dane", async () => {
    await expect(
      parseDispatchDictionariesResponse(jsonResponse({ error: "unauthorized" }, 401))
    ).resolves.toBeNull();
    await expect(
      parseDispatchDictionariesResponse(
        jsonResponse({
          workers: [],
          machines: [],
          materials: [],
          materialCategories: [],
          customers: [],
        })
      )
    ).resolves.toBeNull();
  });

  it("parsuje poprawny payload słowników", async () => {
    const payload = await parseDispatchDictionariesResponse(
      jsonResponse({
        workers: [{ id: 1, fullName: "Jan Kowalski" }],
        machines: [{ id: 2, name: "Koparka" }],
        materials: [{ id: 3, name: "Piasek", unit: "t" }],
        materialCategories: [{ id: 4, name: "Kruszywo", color: "#fff" }],
        customers: [{ id: 5, firstName: "Anna", lastName: "Nowak", phone: null }],
        categories: [{ id: 6, name: "Budowa" }],
      })
    );

    expect(payload?.workers).toEqual([{ id: 1, fullName: "Jan Kowalski" }]);
    expect(payload?.machines).toHaveLength(1);
    expect(payload?.materials).toHaveLength(1);
    expect(payload?.materialCategories).toEqual([{ id: 4, name: "Kruszywo", color: "#fff" }]);
    expect(payload?.customers).toHaveLength(1);
    expect(payload?.categories).toHaveLength(1);
  });
});
