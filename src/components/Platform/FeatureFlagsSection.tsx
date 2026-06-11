"use client";

import { useState, useEffect, useCallback } from "react";
import type { FeatureFlags } from "@/types/featureFlags";
import {
  DEFAULT_FEATURE_FLAGS,
  DUR_FEATURE_FLAG_KEYS,
  gpsModuleFlagsPatch,
  isGpsModuleEnabled,
} from "@/types/featureFlags";
import type { AppDictionary } from "@/i18n/types";
import { useDictionary } from "@/i18n";
import { WorkerPermissionToggles } from "@/components/Admin/WorkerPermissionToggles";

type Props = {
  companyId: number;
  dict: AppDictionary["platform"]["settings"];
  /** Gdy true — render w wierszu tabeli (bez marginesu górnego). */
  inline?: boolean;
};

export function FeatureFlagsSection({ companyId, dict, inline = false }: Props) {
  const apiErrors = useDictionary().apiErrors as Record<string, string>;
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  // Reset ładowania przy zmianie firmy — w trakcie renderu, bez kaskady w efekcie.
  const [prevCompanyId, setPrevCompanyId] = useState(companyId);
  if (prevCompanyId !== companyId) {
    setPrevCompanyId(companyId);
    setLoading(true);
  }

  const loadFlags = useCallback(async () => {
    try {
      const res = await fetch(`/api/platform/feature-flags/${companyId}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { flags?: FeatureFlags };
      if (data.flags) setFlags(data.flags);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  async function persistFlags(patch: Partial<FeatureFlags>, rollback: FeatureFlags) {
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
        setFlags(rollback);
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(apiErrors[body.error ?? ""] ?? dict.saveError);
        setMessageIsError(true);
        return;
      }
      setMessage(dict.saveSuccess);
      setMessageIsError(false);
    } catch {
      setFlags(rollback);
      setMessage(dict.saveError);
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  async function toggleGpsModule() {
    if (saving) return;
    const newValue = !isGpsModuleEnabled(flags);
    const rollback = flags;
    const patch = gpsModuleFlagsPatch(newValue);
    setFlags((prev) => ({ ...prev, ...patch }));
    await persistFlags(patch, rollback);
  }

  async function toggleDurModule() {
    if (saving) return;
    const key = DUR_FEATURE_FLAG_KEYS[0];
    const newValue = !flags[key];
    const rollback = flags;
    setFlags((prev) => ({ ...prev, [key]: newValue }));
    await persistFlags({ [key]: newValue }, rollback);
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

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {dict.gpsModuleTitle}
          </p>
          <WorkerPermissionToggles
            toggles={[
              {
                id: "gps-module",
                checked: isGpsModuleEnabled(flags),
                onChange: () => {
                  void toggleGpsModule();
                },
                label: dict.gpsModuleEnabled,
                hint: dict.gpsModuleHint,
              },
            ]}
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
                onChange: () => {
                  void toggleDurModule();
                },
                label: dict.durEnabled,
                hint: dict.durEnabledHint,
              },
            ]}
          />
        </div>
      </div>

      {message ? (
        <p className={`mt-3 text-xs ${messageIsError ? "text-red-600" : "text-emerald-600"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
