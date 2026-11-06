import { parseWorkOrderRequiredIds, parseWorkOrderRoutePayload } from "./workOrderRoutePayload";
import { describe, expect, it } from "vitest";
import { parseOrderBody, parsePositiveIntParam } from "./parseRouteParams";

describe("strict order identifiers", () => {
  it.each(["12junk", "1.5", 1.5, 0, -1, true, {}, "", Number.MAX_SAFE_INTEGER + 1])(
    "rejects %j",
    (value) => {
      expect(parsePositiveIntParam(value)).toBeNull();
    }
  );
  it.each([12, "12", " 12 "])("accepts %j", (value) => {
    expect(parsePositiveIntParam(value)).toBe(12);
  });
  it("does not silently discard malformed optional fields", () => {
    for (const field of [
      "quantityTons",
      "expectedDurationHours",
      "taskDescription",
      "repairDescription",
      "orderType",
      "dueDate",
    ]) {
      expect(() => parseOrderBody({ categoryId: 1, resourceId: 2, [field]: {} })).toThrow(
        "invalid_payload"
      );
    }
    expect(() => parseOrderBody({ categoryId: 1, resourceId: 2, materialId: "1junk" })).toThrow(
      "invalid_payload"
    );
  });
});

it("rejects ambiguous admin identifiers and force flag", () => {
  expect(parseWorkOrderRequiredIds({ userId: "1x", resourceId: 2, categoryId: 3 })).toBeNull();
  expect(() => parseWorkOrderRoutePayload({ materialId: "1x" })).toThrow("invalid_payload");
  expect(() => parseWorkOrderRoutePayload({ expectedDurationHours: {} })).toThrow(
    "invalid_payload"
  );
  expect(parseWorkOrderRoutePayload({ forceSave: "false" }).forceSave).toBe(false);
});
