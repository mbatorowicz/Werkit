import type { FeatureFlags } from "@/types/featureFlags";
import { DEFAULT_FEATURE_FLAGS } from "@/types/featureFlags";

export const COMPANY_LIFECYCLE_STATUSES = ["trial", "active", "suspended", "archived"] as const;
export type CompanyLifecycleStatus = (typeof COMPANY_LIFECYCLE_STATUSES)[number];

export const COMPANY_PLAN_KEYS = ["field_ops", "field_ops_mro", "yard", "custom"] as const;
export type CompanyPlanKey = (typeof COMPANY_PLAN_KEYS)[number];

/** Presety pakietu — bez `custom` (ręczne przełączniki). */
export const COMPANY_PLAN_PRESETS = ["field_ops", "field_ops_mro", "yard"] as const;
export type CompanyPlanPreset = (typeof COMPANY_PLAN_PRESETS)[number];

export const INTERNAL_NOTE_MAX_LENGTH = 2000;
export const DEFAULT_COMPANY_PLAN_KEY: CompanyPlanKey = "field_ops";

const LIFECYCLE_SET = new Set<string>(COMPANY_LIFECYCLE_STATUSES);
const PLAN_SET = new Set<string>(COMPANY_PLAN_KEYS);
const PRESET_SET = new Set<string>(COMPANY_PLAN_PRESETS);

export function isCompanyLifecycleStatus(value: unknown): value is CompanyLifecycleStatus {
  return typeof value === "string" && LIFECYCLE_SET.has(value);
}

export function isCompanyPlanKey(value: unknown): value is CompanyPlanKey {
  return typeof value === "string" && PLAN_SET.has(value);
}

export function isCompanyPlanPreset(value: unknown): value is CompanyPlanPreset {
  return typeof value === "string" && PRESET_SET.has(value);
}

/** Login, impersonacja i nowe konta admin — tylko gdy status mapuje na `is_active=true`. */
export function lifecycleToIsActive(status: CompanyLifecycleStatus): boolean {
  return status === "trial" || status === "active";
}

export function canCreateCompanyAdmin(status: CompanyLifecycleStatus): boolean {
  return lifecycleToIsActive(status);
}

/**
 * Toggle `isActive` w tabeli firm: active/trial ↔ suspended.
 * Archiwum nie rusza się jednym kliknięciem — tylko `lifecycleStatus: archived`.
 */
export function applyIsActiveToggle(
  current: CompanyLifecycleStatus,
  nextIsActive: boolean
): { lifecycleStatus: CompanyLifecycleStatus; isActive: boolean } {
  if (current === "archived") {
    return { lifecycleStatus: "archived", isActive: false };
  }
  if (nextIsActive) {
    const lifecycleStatus: CompanyLifecycleStatus = current === "trial" ? "trial" : "active";
    return { lifecycleStatus, isActive: true };
  }
  return { lifecycleStatus: "suspended", isActive: false };
}

export function parseInternalNote(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > INTERNAL_NOTE_MAX_LENGTH
    ? trimmed.slice(0, INTERNAL_NOTE_MAX_LENGTH)
    : trimmed;
}

const GPS_ON = {
  gpsTrackingEnabled: true,
  mapViewEnabled: true,
  geofencingEnabled: true,
  routePlanningEnabled: true,
  navigationEnabled: true,
} as const;

const GPS_OFF = {
  gpsTrackingEnabled: false,
  mapViewEnabled: false,
  geofencingEnabled: false,
  routePlanningEnabled: false,
  navigationEnabled: false,
} as const;

export const PLAN_PRESET_FLAGS: Record<CompanyPlanPreset, FeatureFlags> = {
  field_ops: { ...DEFAULT_FEATURE_FLAGS, ...GPS_ON, durEnabled: false },
  field_ops_mro: { ...GPS_ON, durEnabled: true },
  yard: { ...GPS_OFF, durEnabled: true },
};

export function flagsForPlanKey(planKey: CompanyPlanKey): FeatureFlags | null {
  if (planKey === "custom") return null;
  return { ...PLAN_PRESET_FLAGS[planKey] };
}

/**
 * PUT flag: preset nadpisuje pełny zestaw flag; ręczny patch bez presetu → `custom`.
 */
export function resolvePlanFlagPatch(input: {
  planKey?: unknown;
  flags: Partial<FeatureFlags>;
}): { planKey: CompanyPlanKey; flags: Partial<FeatureFlags> } | { error: "invalid_payload" } {
  if (isCompanyPlanPreset(input.planKey)) {
    return { planKey: input.planKey, flags: PLAN_PRESET_FLAGS[input.planKey] };
  }
  if (Object.keys(input.flags).length === 0) {
    return { error: "invalid_payload" };
  }
  return { planKey: "custom", flags: input.flags };
}

export function filterCompaniesForRegistry<T extends { lifecycleStatus: CompanyLifecycleStatus }>(
  rows: T[],
  hideArchived: boolean
): T[] {
  if (!hideArchived) return rows;
  return rows.filter((row) => row.lifecycleStatus !== "archived");
}
