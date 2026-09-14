"use client";

import { useState, useEffect, useCallback } from "react";
import type { FeatureFlags } from "@/types/featureFlags";
import {
  DEFAULT_FEATURE_FLAGS,
  DUR_FEATURE_FLAG_KEYS,
  GPS_FEATURE_FLAG_KEYS,
} from "@/types/featureFlags";
import type { AppDictionary } from "@/i18n/types";
import { useDictionary } from "@/i18n";
import { WorkerPermissionToggles } from "@/components/Admin/WorkerPermissionToggles";
import { CHIP_IDLE, CHIP_SELECTED } from "@/lib/uiChrome";
import { cn } from "@/lib/cn";
import {
  COMPANY_PLAN_PRESETS,
  flagsForPlanKey,
  isCompanyPlanKey,
  type CompanyPlanKey,
  type CompanyPlanPreset,
} from "@/lib/companyLifecycle";

type Props = {
  companyId: number;
  dict: AppDictionary["platform"]["settings"];
  /** Gdy true — render w wierszu tabeli (bez marginesu górnego). */
  inline?: boolean;
  initialPlanKey?: CompanyPlanKey | null;
  onChanged?: () => Promise<void>;
};

type GpsFlagKey = (typeof GPS_FEATURE_FLAG_KEYS)[number];

function gpsFlagHint(dict: Props["dict"], key: GpsFlagKey): string {
  const hintKey = `${key}Hint` as keyof Props["dict"];
  const hint = dict[hintKey];
  return typeof hint === "string" ? hint : "";
}

function presetLabel(dict: Props["dict"], key: CompanyPlanPreset): string {
  if (key === "field_ops") return dict.planFieldOps;
  if (key === "field_ops_mro") return dict.planFieldOpsMro;
  return dict.planYard;
}

function presetHint(dict: Props["dict"], key: CompanyPlanPreset): string {
  if (key === "field_ops") return dict.planFieldOpsHint;
  if (key === "field_ops_mro") return dict.planFieldOpsMroHint;
  return dict.planYardHint;
}

function PlanPresetBar({
  dict,
  planKey,
  saving,
  onApply,
}: {
  dict: Props["dict"];
  planKey: CompanyPlanKey | null;
  saving: boolean;
  onApply: (preset: CompanyPlanPreset) => void;
}) {
  return (
    <div className="mb-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {dict.planPresetsTitle}
      </p>
      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{dict.planPresetsHint}</p>
      <div className="flex flex-wrap items-center gap-2">
        {COMPANY_PLAN_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={saving}
            title={presetHint(dict, preset)}
            onClick={() => onApply(preset)}
            className={cn(planKey === preset ? CHIP_SELECTED : CHIP_IDLE, "disabled:opacity-60")}
          >
            {presetLabel(dict, preset)}
          </button>
        ))}
        {planKey === "custom" || planKey == null ? (
          <span className={CHIP_IDLE}>{dict.planCustom}</span>
        ) : null}
      </div>
    </div>
  );
}

function FlagToggleGroups({
  dict,
  flags,
  onToggle,
}: {
  dict: Props["dict"];
  flags: FeatureFlags;
  onToggle: (key: keyof FeatureFlags) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {dict.gpsModuleTitle}
        </p>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{dict.gpsModuleHint}</p>
        <WorkerPermissionToggles
          toggles={GPS_FEATURE_FLAG_KEYS.map((key) => ({
            id: key,
            checked: flags[key],
            onChange: () => onToggle(key),
            label: dict[key],
            hint: gpsFlagHint(dict, key),
          }))}
        />
      </div>
      <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {dict.durModuleTitle}
        </p>
        <WorkerPermissionToggles
          toggles={[
            {
              id: "dur-module",
              checked: flags.durEnabled,
              onChange: () => onToggle(DUR_FEATURE_FLAG_KEYS[0]),
              label: dict.durEnabled,
              hint: dict.durEnabledHint,
            },
          ]}
        />
      </div>
    </div>
  );
}

export function FeatureFlagsSection({
  companyId,
  dict,
  inline = false,
  initialPlanKey = null,
  onChanged,
}: Props) {
  const apiErrors = useDictionary().apiErrors as Record<string, string>;
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [planKey, setPlanKey] = useState<CompanyPlanKey | null>(initialPlanKey);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  const [prevCompanyId, setPrevCompanyId] = useState(companyId);
  if (prevCompanyId !== companyId) {
    setPrevCompanyId(companyId);
    setLoading(true);
    setPlanKey(initialPlanKey);
  }

  const loadFlags = useCallback(async () => {
    try {
      const res = await fetch(`/api/platform/feature-flags/${companyId}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { flags?: FeatureFlags; planKey?: unknown };
      if (data.flags) setFlags(data.flags);
      if (isCompanyPlanKey(data.planKey)) setPlanKey(data.planKey);
      else if (data.planKey === null) setPlanKey(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  async function persist(
    patch: Partial<FeatureFlags> & { planKey: CompanyPlanKey },
    rollback: { flags: FeatureFlags; planKey: CompanyPlanKey | null }
  ) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/platform/feature-flags/${companyId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setFlags(rollback.flags);
        setPlanKey(rollback.planKey);
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(apiErrors[body.error ?? ""] ?? dict.saveError);
        setMessageIsError(true);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as {
        flags?: FeatureFlags;
        planKey?: unknown;
      };
      if (body.flags) setFlags(body.flags);
      if (isCompanyPlanKey(body.planKey)) setPlanKey(body.planKey);
      setMessage(dict.saveSuccess);
      setMessageIsError(false);
      await onChanged?.();
    } catch {
      setFlags(rollback.flags);
      setPlanKey(rollback.planKey);
      setMessage(dict.saveError);
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  async function toggleFlag(key: keyof FeatureFlags) {
    if (saving) return;
    const newValue = !flags[key];
    const rollback = { flags, planKey };
    setFlags((prev) => ({ ...prev, [key]: newValue }));
    setPlanKey("custom");
    await persist({ [key]: newValue, planKey: "custom" }, rollback);
  }

  async function applyPreset(preset: CompanyPlanPreset) {
    if (saving) return;
    const nextFlags = flagsForPlanKey(preset);
    if (!nextFlags) return;
    const rollback = { flags, planKey };
    setFlags(nextFlags);
    setPlanKey(preset);
    await persist({ ...nextFlags, planKey: preset }, rollback);
  }

  const shellClass = inline
    ? "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
    : "mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

  if (loading) {
    return (
      <div className={shellClass}>
        <p className="animate-pulse text-sm text-zinc-500">{dict.title}…</p>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{dict.title}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{dict.subtitle}</p>
      </div>

      <PlanPresetBar
        dict={dict}
        planKey={planKey}
        saving={saving}
        onApply={(preset) => void applyPreset(preset)}
      />

      <FlagToggleGroups dict={dict} flags={flags} onToggle={(key) => void toggleFlag(key)} />

      {message ? (
        <p className={`mt-3 text-xs ${messageIsError ? "text-red-600" : "text-emerald-600"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
