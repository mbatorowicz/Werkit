import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { clearBiometricCredentials, saveBiometricCredentials } from "@/lib/biometricLogin";

export type BiometricToggleDeps = {
  apiErrors: Record<string, string>;
  saveErrorLabel: string;
  setBusy: (val: boolean) => void;
  setError: (val: string) => void;
  setEnabled: (val: boolean) => void;
  setCredentialsSaved: (val: boolean) => void;
};

export async function disableBiometricLogin(deps: BiometricToggleDeps): Promise<void> {
  deps.setBusy(true);
  deps.setError("");
  try {
    await clearBiometricCredentials();
    const res = await fetchWithDeviceTelemetry(
      "Worker profile: biometric off",
      "/api/worker/profile",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biometricLoginEnabled: false }),
      },
      { category: "profile" }
    );
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      deps.setError(deps.apiErrors[data.error ?? ""] ?? data.error ?? deps.saveErrorLabel);
      return;
    }
    deps.setEnabled(false);
    deps.setCredentialsSaved(false);
  } finally {
    deps.setBusy(false);
  }
}

export async function enableBiometricLoginWithPassword(
  deps: BiometricToggleDeps,
  args: {
    usernameEmail: string;
    pwd: string;
    vaultErrorLabel: string;
    setPwd: (val: string) => void;
    setPwdOpen: (val: boolean) => void;
  }
): Promise<void> {
  deps.setBusy(true);
  deps.setError("");
  try {
    const res = await fetchWithDeviceTelemetry(
      "Worker profile: biometric on",
      "/api/worker/profile",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biometricLoginEnabled: true,
          password: args.pwd,
        }),
      },
      { category: "profile" }
    );
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      deps.setError(deps.apiErrors[data.error ?? ""] ?? data.error ?? deps.saveErrorLabel);
      return;
    }
    try {
      await saveBiometricCredentials(args.usernameEmail, args.pwd);
    } catch {
      await fetchWithDeviceTelemetry(
        "Worker profile: biometric rollback",
        "/api/worker/profile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ biometricLoginEnabled: false }),
        },
        { category: "profile" }
      );
      deps.setError(args.vaultErrorLabel);
      args.setPwd("");
      args.setPwdOpen(false);
      return;
    }
    deps.setEnabled(true);
    deps.setCredentialsSaved(true);
    args.setPwd("");
    args.setPwdOpen(false);
  } finally {
    deps.setBusy(false);
  }
}
