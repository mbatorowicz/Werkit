"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { getDictionary } from "@/i18n";
import {
  biometricHardwareAvailable,
  clearBiometricCredentials,
  hasSavedBiometricCredentials,
  isNativeBiometricContext,
  saveBiometricCredentials,
} from "@/lib/biometricLogin";

type Role = "worker" | "admin";

export function BiometricLoginSettings({
  usernameEmail,
  role,
  initialBiometricLoginEnabled,
}: {
  usernameEmail: string;
  role: Role;
  initialBiometricLoginEnabled: boolean;
}) {
  const dict = getDictionary().worker.profile;
  const [enabled, setEnabled] = useState(initialBiometricLoginEnabled);
  const [hardwareOk, setHardwareOk] = useState<boolean | null>(null);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setEnabled(initialBiometricLoginEnabled);
  }, [initialBiometricLoginEnabled]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isNativeBiometricContext()) {
        setHardwareOk(false);
        return;
      }
      const [avail, saved] = await Promise.all([
        biometricHardwareAvailable(),
        hasSavedBiometricCredentials(),
      ]);
      if (!cancelled) {
        setHardwareOk(avail);
        setCredentialsSaved(saved);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (role !== "worker") return null;
  if (!isNativeBiometricContext()) return null;
  if (hardwareOk === false) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {dict.biometricUnavailable}
      </div>
    );
  }
  if (hardwareOk === null) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 mt-4 text-sm text-zinc-500">
        {dict.biometricChecking}
      </div>
    );
  }

  const toggleOff = async () => {
    setBusy(true);
    setError("");
    try {
      await clearBiometricCredentials();
      const res = await fetch("/api/worker/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biometricLoginEnabled: false }),
      });
      if (!res.ok) {
        const apiErrors = getDictionary().apiErrors as Record<string, string>;
        const data = (await res.json()) as { error?: string };
        setError(apiErrors[data.error ?? ""] ?? data.error ?? dict.biometricSaveError);
        return;
      }
      setEnabled(false);
      setCredentialsSaved(false);
    } finally {
      setBusy(false);
    }
  };

  const submitEnableWithPassword = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/worker/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biometricLoginEnabled: true,
          password: pwd,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const apiErrors = getDictionary().apiErrors as Record<string, string>;
        setError(apiErrors[data.error ?? ""] ?? data.error ?? dict.biometricSaveError);
        return;
      }
      try {
        await saveBiometricCredentials(usernameEmail, pwd);
      } catch {
        await fetch("/api/worker/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ biometricLoginEnabled: false }),
        });
        setError(dict.biometricVaultError);
        setPwd("");
        setPwdOpen(false);
        return;
      }
      setEnabled(true);
      setCredentialsSaved(true);
      setPwd("");
      setPwdOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const onToggleChange = async () => {
    if (busy) return;
    if (enabled) {
      await toggleOff();
      return;
    }
    setPwdOpen(true);
    setPwd("");
    setError("");
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 flex justify-between items-center mt-4 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-lg shrink-0">
            <Fingerprint className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-zinc-900 dark:text-white font-medium">{dict.biometricTitle}</div>
            <div className="text-xs text-zinc-500">{dict.biometricDesc}</div>
            {enabled && !credentialsSaved && (
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">{dict.biometricResyncHint}</div>
            )}
          </div>
        </div>
        <label className="relative flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={enabled}
            disabled={busy}
            onChange={onToggleChange}
          />
          <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-50" />
        </label>
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-500 px-1">{error}</div>
      )}

      {pwdOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">{dict.biometricConfirmTitle}</h3>
            <p className="text-xs text-zinc-500 mb-4">{dict.biometricConfirmHint}</p>
            <input
              type="password"
              autoComplete="current-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder={dict.biometricPasswordPlaceholder}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 mb-4 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPwdOpen(false);
                  setPwd("");
                  setError("");
                }}
                className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {dict.biometricCancel}
              </button>
              <button
                type="button"
                disabled={busy || !pwd.trim()}
                onClick={() => void submitEnableWithPassword()}
                className="px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
              >
                {busy ? "…" : dict.biometricConfirmSave}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
