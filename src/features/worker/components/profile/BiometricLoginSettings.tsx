"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { getDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import {
  biometricHardwareAvailable,
  clearBiometricCredentials,
  hasSavedBiometricCredentials,
  isNativeBiometricContext,
  saveBiometricCredentials,
} from "@/lib/biometricLogin";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";

const BIOMETRIC_FORM_ID = "worker-biometric-pwd-form";

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
    queueMicrotask(() => setEnabled(initialBiometricLoginEnabled));
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
      const res = await fetchWithDeviceTelemetry("Worker profile: biometric off", "/api/worker/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biometricLoginEnabled: false }),
      }, { category: "profile" });
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
      const res = await fetchWithDeviceTelemetry("Worker profile: biometric on", "/api/worker/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biometricLoginEnabled: true,
          password: pwd,
        }),
      }, { category: "profile" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const apiErrors = getDictionary().apiErrors as Record<string, string>;
        setError(apiErrors[data.error ?? ""] ?? data.error ?? dict.biometricSaveError);
        return;
      }
      try {
        await saveBiometricCredentials(usernameEmail, pwd);
      } catch {
        await fetchWithDeviceTelemetry(
          "Worker profile: biometric rollback",
          "/api/worker/profile",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ biometricLoginEnabled: false }),
          },
          { category: "profile" },
        );
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

      <AdminModalShell
        open={pwdOpen}
        onClose={() => {
          setPwdOpen(false);
          setPwd("");
          setError("");
        }}
        title={dict.biometricConfirmTitle}
        maxWidthClass="max-w-sm"
        titleSize="lg"
        zIndexClass="z-[9999]"
        scrollableBody
        closeOnBackdropClick={false}
        footer={
          <FormModalFooter
            formId={BIOMETRIC_FORM_ID}
            onCancel={() => {
              setPwdOpen(false);
              setPwd("");
              setError("");
            }}
            cancelLabel={dict.biometricCancel}
            submitLabel={busy ? "…" : dict.biometricConfirmSave}
            isSubmitting={busy}
            submitDisabled={!pwd.trim()}
            submitClassName="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center min-w-[7rem]"
          />
        }
      >
        <form
          id={BIOMETRIC_FORM_ID}
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void submitEnableWithPassword();
          }}
        >
          <p className="text-xs text-zinc-500">{dict.biometricConfirmHint}</p>
          <input
              type="password"
              autoComplete="current-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder={dict.biometricPasswordPlaceholder}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </form>
      </AdminModalShell>
    </>
  );
}
