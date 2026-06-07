import { Capacitor } from "@capacitor/core";
import { NativeBiometric, AccessControl } from "@capgo/capacitor-native-biometric";

/** Klucz „serwera” w Keystore/Keychain — powiązanie z domeną aplikacji. */
export const WERKIT_BIOMETRIC_SERVER = "com.werkit.app.auth";

export type BiometricPromptLabels = {
  reason: string;
  title: string;
  subtitle: string;
  cancel: string;
};

const DEFAULT_BIOMETRIC_LABELS: BiometricPromptLabels = {
  reason: "Potwierdź tożsamość, aby się zalogować",
  title: "Werkit",
  subtitle: "Logowanie biometryczne",
  cancel: "Anuluj",
};

export function isNativeBiometricContext(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export async function biometricHardwareAvailable(): Promise<boolean> {
  if (!isNativeBiometricContext()) return false;
  try {
    const r = await NativeBiometric.isAvailable({ useFallback: false });
    return Boolean(r.isAvailable);
  } catch {
    return false;
  }
}

export async function hasSavedBiometricCredentials(): Promise<boolean> {
  if (!isNativeBiometricContext()) return false;
  try {
    const { isSaved } = await NativeBiometric.isCredentialsSaved({
      server: WERKIT_BIOMETRIC_SERVER,
    });
    return isSaved;
  } catch {
    return false;
  }
}

export async function saveBiometricCredentials(username: string, password: string): Promise<void> {
  await NativeBiometric.setCredentials({
    username,
    password,
    server: WERKIT_BIOMETRIC_SERVER,
    accessControl: AccessControl.BIOMETRY_ANY,
  });
}

export async function clearBiometricCredentials(): Promise<void> {
  try {
    await NativeBiometric.deleteCredentials({
      server: WERKIT_BIOMETRIC_SERVER,
    });
  } catch {
    /* brak zapisanych danych */
  }
}

export async function fetchCredentialsWithBiometricPrompt(
  labels: BiometricPromptLabels = DEFAULT_BIOMETRIC_LABELS
): Promise<{
  username: string;
  password: string;
} | null> {
  try {
    return await NativeBiometric.getSecureCredentials({
      server: WERKIT_BIOMETRIC_SERVER,
      reason: labels.reason,
      title: labels.title,
      subtitle: labels.subtitle,
      negativeButtonText: labels.cancel,
    });
  } catch {
    return null;
  }
}
