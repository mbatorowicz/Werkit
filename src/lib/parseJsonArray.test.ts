import { describe, expect, it } from "vitest";
import { parseJsonArray } from "@/lib/parseJsonArray";

function jsonResponse(ok: boolean, contentType: string, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { "content-type": contentType },
  });
}

describe("parseJsonArray", () => {
  it("zwraca [] gdy res.ok jest false", async () => {
    const res = jsonResponse(false, "application/json", [1, 2]);
    await expect(parseJsonArray(res)).resolves.toEqual([]);
  });

  it("zwraca [] gdy brak application/json", async () => {
    const res = jsonResponse(true, "text/plain", [1]);
    await expect(parseJsonArray(res)).resolves.toEqual([]);
  });

  it("zwraca [] gdy JSON nie jest tablicą", async () => {
    const res = jsonResponse(true, "application/json", { a: 1 });
    await expect(parseJsonArray(res)).resolves.toEqual([]);
  });

  it("zwraca tablicę gdy odpowiedź jest poprawną JSON tablicą", async () => {
    const res = jsonResponse(true, "application/json", [{ id: 1 }, 2, "x"]);
    await expect(parseJsonArray(res)).resolves.toEqual([{ id: 1 }, 2, "x"]);
  });

  it("zwraca [] gdy json() rzuca", async () => {
    const res = new Response("not-json", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await expect(parseJsonArray(res)).resolves.toEqual([]);
  });
});
