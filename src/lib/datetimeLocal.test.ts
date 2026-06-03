import { describe, expect, it } from "vitest";
import { roundDatetimeLocalToStep } from "./datetimeLocal";

describe("roundDatetimeLocalToStep", () => {
  it("zaokrągla do 10 minut", () => {
    expect(roundDatetimeLocalToStep("2026-06-03T14:26")).toBe("2026-06-03T14:30");
    expect(roundDatetimeLocalToStep("2026-06-03T14:23")).toBe("2026-06-03T14:20");
  });

  it("pusta wartość bez zmian", () => {
    expect(roundDatetimeLocalToStep("")).toBe("");
  });
});
