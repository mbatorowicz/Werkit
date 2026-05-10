import { Capacitor } from "@capacitor/core";
import {
  NativeBiometric,
  AccessControl,
} from "@capgo/capacitor-native-biometric";

/** Klucz „serwera” w Keystore/Keychain — powiązanie z domeną aplikacji. */
export const WERKIT_BIOMETRIC_SERVER = "com.werkit.app.auth";

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

export async function saveBiometricCredentials(
  username: string,
  password: string,
): Promise<void> {
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

export async function fetchCredentialsWithBiometricPrompt(): Promise<{
  username: string;
  password: string;
} | null> {
  try {
    return await NativeBiometric.getSecureCredentials({
      server: WERKIT_BIOMETRIC_SERVER,
      reason: "Potwierdź tożsamość, aby zalogować się do Werkit",
      title: "Werkit",
      subtitle: "Logowanie biometryczne",
      negativeButtonText: "Anuluj",
    });
  } catch {
    return null;
  }
}
