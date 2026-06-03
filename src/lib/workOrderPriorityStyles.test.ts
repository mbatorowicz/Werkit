import { describe, expect, it } from "vitest";
import {
  WORK_ORDER_PRIORITY_DOT_CLASS,
  workOrderPriorityDotClassName,
  workOrderPriorityLabel,
} from "./workOrderPriorityStyles";

const labels = {
  priorityUrgent: "PILNE",
  priorityImportant: "WYSOKI",
  priorityNormal: "NORMALNY",
  priorityLow: "NISKI",
};

describe("workOrderPriorityStyles", () => {
  it("workOrderPriorityLabel mapuje wszystkie poziomy", () => {
    expect(workOrderPriorityLabel("URGENT", labels)).toBe("PILNE");
    expect(workOrderPriorityLabel("HIGH", labels)).toBe("WYSOKI");
    expect(workOrderPriorityLabel("NORMAL", labels)).toBe("NORMALNY");
    expect(workOrderPriorityLabel("LOW", labels)).toBe("NISKI");
    expect(workOrderPriorityLabel(null, labels)).toBe("NORMALNY");
  });

  it("workOrderPriorityDotClassName używa SSOT kolorów", () => {
    expect(workOrderPriorityDotClassName("HIGH")).toContain(WORK_ORDER_PRIORITY_DOT_CLASS.HIGH);
    expect(workOrderPriorityDotClassName("URGENT")).toContain("animate-pulse");
  });
});
