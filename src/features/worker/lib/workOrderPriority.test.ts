import { describe, expect, it } from "vitest";
import { normalizeWorkOrderPriority } from "@/features/worker/lib/workOrderPriority";

describe("normalizeWorkOrderPriority", () => {
  it.each(["URGENT", "HIGH", "NORMAL", "LOW"] as const)("zwraca %s bez zmian", (p) => {
    expect(normalizeWorkOrderPriority(p)).toBe(p);
  });

  it("dla null i undefined zwraca null", () => {
    expect(normalizeWorkOrderPriority(null)).toBeNull();
    expect(normalizeWorkOrderPriority(undefined)).toBeNull();
  });

  it("dla pustego stringa zwraca null", () => {
    expect(normalizeWorkOrderPriority("")).toBeNull();
  });

  it("dla nieznanego priorytetu zwraca NORMAL (ochrona przed złym API / bazą)", () => {
    expect(normalizeWorkOrderPriority("SUPER_HIGH")).toBe("NORMAL");
    expect(normalizeWorkOrderPriority("urgent")).toBe("NORMAL");
    expect(normalizeWorkOrderPriority(" ")).toBe("NORMAL");
  });
});
