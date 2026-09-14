import { describe, expect, it } from "vitest";
import { findPgUniqueViolation, isPgUniqueViolation } from "@/lib/pgErrors";

describe("pgErrors", () => {
  it("rozpoznaje 23505 na wierzchu", () => {
    const err = Object.assign(new Error("duplicate key"), { code: "23505" });
    expect(isPgUniqueViolation(err)).toBe(true);
    expect(findPgUniqueViolation(err)?.message).toBe("duplicate key");
  });

  it("rozpoznaje 23505 w łańcuchu cause (Drizzle)", () => {
    const driver = Object.assign(new Error("duplicate key value"), { code: "23505" });
    const wrapped = new Error("Failed query: insert into users");
    Object.assign(wrapped, { cause: driver });
    expect(isPgUniqueViolation(wrapped)).toBe(true);
  });

  it("odrzuca inne błędy", () => {
    expect(isPgUniqueViolation(new Error("network"))).toBe(false);
    expect(isPgUniqueViolation({ code: "23503" })).toBe(false);
    expect(isPgUniqueViolation(null)).toBe(false);
  });
});
