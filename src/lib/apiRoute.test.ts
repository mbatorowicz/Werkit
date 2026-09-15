import { describe, expect, it } from "vitest";
import { ApiRouteError, parseJsonBodyOrEmpty } from "@/lib/apiRoute";

describe("parseJsonBodyOrEmpty", () => {
  it("pusty POST bez Content-Type → {}", async () => {
    const body = await parseJsonBodyOrEmpty(
      new Request("http://localhost/api/x", { method: "POST" })
    );
    expect(body).toEqual({});
  });

  it("application/json z {} → {}", async () => {
    const body = await parseJsonBodyOrEmpty(
      new Request("http://localhost/api/x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    );
    expect(body).toEqual({});
  });

  it("form-urlencoded (CSRF) → invalid_json, nie puste ciało", async () => {
    await expect(
      parseJsonBodyOrEmpty(
        new Request("http://localhost/api/worker/work-orders/1/accept", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "foo=bar",
        })
      )
    ).rejects.toBeInstanceOf(ApiRouteError);
  });
});
