import { describe, expect, it } from "vitest";
import { dispatchStatusPillClass, logLevelColorClass, uiStatusToneClasses } from "./uiStatus";

describe("uiStatus", () => {
  it("odróżnia planned / active / done bez niebieskiego", () => {
    expect(uiStatusToneClasses("planned").pill).toContain("amber");
    expect(uiStatusToneClasses("active").pill).toContain("emerald");
    expect(uiStatusToneClasses("done").pill).toContain("emerald");
    expect(uiStatusToneClasses("active").pill).not.toContain("blue");
  });

  it("dispatchStatusPillClass mapuje status zlecenia", () => {
    expect(dispatchStatusPillClass("PENDING")).toContain("amber");
    expect(dispatchStatusPillClass("IN_PROGRESS")).toContain("emerald-600");
    expect(dispatchStatusPillClass("COMPLETED")).toContain("emerald-50");
  });

  it("logLevelColorClass — DEBUG jest zinc, nie blue", () => {
    expect(logLevelColorClass("ERROR")).toContain("red");
    expect(logLevelColorClass("WARN")).toContain("amber");
    expect(logLevelColorClass("DEBUG")).toContain("zinc");
    expect(logLevelColorClass("INFO")).toContain("emerald");
  });
});
