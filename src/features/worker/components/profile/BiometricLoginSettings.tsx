"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { useDictionary } from "@/i18n";
import {
  biometricHardwareAvailable,
  hasSavedBiometricCredentials,
  isNativeBiometricContext,
} from "@/lib/biometricLogin";
import { BiometricPasswordModal } from "@/features/worker/components/profile/BiometricPasswordModal";
import {
  disableBiometricLogin,
  enableBiometricLoginWithPassword,
} from "@/features/worker/components/profile/biometricToggleActions";

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
  const dictionary = useDictionary();
  const dict = dictionary.worker.profile;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
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

  const actionDeps = {
    apiErrors,
    saveErrorLabel: dict.biometricSaveError,
    setBusy,
    setError,
    setEnabled,
    setCredentialsSaved,
  };

  const toggleOff = () => disableBiometricLogin(actionDeps);

  const submitEnableWithPassword = () =>
    enableBiometricLoginWithPassword(actionDeps, {
      usernameEmail,
      pwd,
      vaultErrorLabel: dict.biometricVaultError,
      setPwd,
      setPwdOpen,
    });

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
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {dict.biometricResyncHint}
              </div>
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
      {error && <div className="mt-2 text-sm text-red-500 px-1">{error}</div>}

      <BiometricPasswordModal
        dict={dict}
        open={pwdOpen}
        busy={busy}
        pwd={pwd}
        setPwd={setPwd}
        onClose={() => {
          setPwdOpen(false);
          setPwd("");
          setError("");
        }}
        onSubmit={() => void submitEnableWithPassword()}
      />
    </>
  );
}
