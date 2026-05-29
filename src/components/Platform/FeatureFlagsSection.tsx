'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FeatureFlags } from '@/types/featureFlags';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_KEYS, FEATURE_FLAG_LABELS } from '@/types/featureFlags';
import type { AppDictionary } from '@/i18n/types';
import { getDictionary } from '@/i18n';

type Props = {
  companyId: number;
  dict: AppDictionary['platform']['settings'];
};

export function FeatureFlagsSection({ companyId, dict }: Props) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/feature-flags/${companyId}`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { flags?: FeatureFlags };
      if (data.flags) setFlags(data.flags);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  async function toggleFlag(key: keyof FeatureFlags) {
    const newValue = !flags[key];
    const previous = flags[key];
    // Optimistic update
    setFlags((prev) => ({ ...prev, [key]: newValue }));
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/platform/feature-flags/${companyId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) {
        // Rollback on error
        setFlags((prev) => ({ ...prev, [key]: previous }));
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const apiErrors = getDictionary().apiErrors as Record<string, string>;
        setMessage(apiErrors[body.error ?? ''] ?? dict.saveError);
        setMessageIsError(true);
        return;
      }
      setMessage(dict.saveSuccess);
      setMessageIsError(false);
    } catch {
      setFlags((prev) => ({ ...prev, [key]: previous }));
      setMessage(dict.saveError);
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <p className="text-sm text-zinc-500 animate-pulse">{dict.title}…</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{dict.title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{dict.subtitle}</p>
      </div>

      <div className="space-y-3">
        {FEATURE_FLAG_KEYS.map((key) => {
          const labelKey = FEATURE_FLAG_LABELS[key];
          const hintKey = `${labelKey}Hint` as keyof typeof dict;
          const label = dict[labelKey as keyof typeof dict] as string;
          const hint = dict[hintKey] as string | undefined;

          return (
            <label
              key={key}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={flags[key]}
                onChange={() => toggleFlag(key)}
                disabled={saving}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {label}
                </span>
                {hint && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{hint}</p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {message && (
        <p
          className={`mt-3 text-xs ${
            messageIsError ? 'text-red-600' : 'text-emerald-600'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
