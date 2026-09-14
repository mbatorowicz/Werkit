import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURE_FLAGS } from "@/types/featureFlags";
import {
  applyIsActiveToggle,
  canCreateCompanyAdmin,
  filterCompaniesForRegistry,
  flagsForPlanKey,
  isCompanyLifecycleStatus,
  isCompanyPlanKey,
  lifecycleToIsActive,
  parseInternalNote,
  PLAN_PRESET_FLAGS,
  resolvePlanFlagPatch,
} from "./companyLifecycle";

describe("lifecycleToIsActive", () => {
  it("trial i active wpuszczają login", () => {
    expect(lifecycleToIsActive("trial")).toBe(true);
    expect(lifecycleToIsActive("active")).toBe(true);
    expect(canCreateCompanyAdmin("trial")).toBe(true);
    expect(canCreateCompanyAdmin("active")).toBe(true);
  });

  it("suspended i archived gaszą is_active", () => {
    expect(lifecycleToIsActive("suspended")).toBe(false);
    expect(lifecycleToIsActive("archived")).toBe(false);
    expect(canCreateCompanyAdmin("suspended")).toBe(false);
    expect(canCreateCompanyAdmin("archived")).toBe(false);
  });
});

describe("applyIsActiveToggle", () => {
  it("active → suspended przy isActive=false", () => {
    expect(applyIsActiveToggle("active", false)).toEqual({
      lifecycleStatus: "suspended",
      isActive: false,
    });
  });

  it("suspended → active przy isActive=true", () => {
    expect(applyIsActiveToggle("suspended", true)).toEqual({
      lifecycleStatus: "active",
      isActive: true,
    });
  });

  it("trial zostaje trial przy włączaniu, a wyłączenie idzie w suspended", () => {
    expect(applyIsActiveToggle("trial", true)).toEqual({
      lifecycleStatus: "trial",
      isActive: true,
    });
    expect(applyIsActiveToggle("trial", false)).toEqual({
      lifecycleStatus: "suspended",
      isActive: false,
    });
  });

  it("archived nie skacze z toggle isActive", () => {
    expect(applyIsActiveToggle("archived", true)).toEqual({
      lifecycleStatus: "archived",
      isActive: false,
    });
    expect(applyIsActiveToggle("archived", false)).toEqual({
      lifecycleStatus: "archived",
      isActive: false,
    });
  });
});

describe("presety pakietu", () => {
  it("field_ops = GPS on, DUR off (domyślne flagi)", () => {
    expect(flagsForPlanKey("field_ops")).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(PLAN_PRESET_FLAGS.field_ops.durEnabled).toBe(false);
  });

  it("field_ops_mro = wszystko on", () => {
    expect(PLAN_PRESET_FLAGS.field_ops_mro).toEqual({
      gpsTrackingEnabled: true,
      mapViewEnabled: true,
      geofencingEnabled: true,
      routePlanningEnabled: true,
      navigationEnabled: true,
      durEnabled: true,
    });
  });

  it("yard = DUR on i GPS off", () => {
    expect(PLAN_PRESET_FLAGS.yard).toEqual({
      gpsTrackingEnabled: false,
      mapViewEnabled: false,
      geofencingEnabled: false,
      routePlanningEnabled: false,
      navigationEnabled: false,
      durEnabled: true,
    });
    expect(flagsForPlanKey("custom")).toBeNull();
  });

  it("preset w PUT nadpisuje pełny zestaw flag", () => {
    expect(resolvePlanFlagPatch({ planKey: "yard", flags: { durEnabled: false } })).toEqual({
      planKey: "yard",
      flags: PLAN_PRESET_FLAGS.yard,
    });
  });

  it("ręczny patch bez presetu ustawia custom", () => {
    expect(resolvePlanFlagPatch({ flags: { durEnabled: true } })).toEqual({
      planKey: "custom",
      flags: { durEnabled: true },
    });
  });

  it("pusty PUT bez presetu to invalid_payload", () => {
    expect(resolvePlanFlagPatch({ flags: {} })).toEqual({ error: "invalid_payload" });
  });
});

describe("parseInternalNote / filtry / guards", () => {
  it("trimuje notatkę i puste zamienia na null", () => {
    expect(parseInternalNote("  hello  ")).toBe("hello");
    expect(parseInternalNote("   ")).toBeNull();
    expect(parseInternalNote(null)).toBeNull();
    expect(parseInternalNote(undefined)).toBeUndefined();
  });

  it("tnie notatkę do 2000 znaków", () => {
    const long = "a".repeat(2001);
    expect(parseInternalNote(long)?.length).toBe(2000);
  });

  it("filtr ukrywa archived przy domyślnym hideArchived", () => {
    const rows = [
      { id: 1, lifecycleStatus: "active" as const },
      { id: 2, lifecycleStatus: "archived" as const },
      { id: 3, lifecycleStatus: "suspended" as const },
    ];
    expect(filterCompaniesForRegistry(rows, true).map((r) => r.id)).toEqual([1, 3]);
    expect(filterCompaniesForRegistry(rows, false)).toHaveLength(3);
  });

  it("waliduje status i plan_key", () => {
    expect(isCompanyLifecycleStatus("active")).toBe(true);
    expect(isCompanyLifecycleStatus("deleted")).toBe(false);
    expect(isCompanyPlanKey("yard")).toBe(true);
    expect(isCompanyPlanKey("enterprise")).toBe(false);
  });
});
