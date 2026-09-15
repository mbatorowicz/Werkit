import { Capacitor, registerPlugin } from "@capacitor/core";

type BatteryOptimizationPlugin = {
  requestIgnoreIfNeeded(): Promise<{ ignoring: boolean; prompted: boolean }>;
};

const BatteryOptimization = registerPlugin<BatteryOptimizationPlugin>("BatteryOptimization");

/**
 * Prosi o wyłączenie optymalizacji baterii dopiero przy starcie GPS (nie w cold start Activity).
 * Stary APK bez wtyczki — cisza, śledzenie i tak startuje.
 */
export async function requestIgnoreBatteryOptimizationsIfNeeded(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (typeof BatteryOptimization.requestIgnoreIfNeeded !== "function") return;
    await BatteryOptimization.requestIgnoreIfNeeded();
  } catch {
    // Brak wtyczki w starszym APK albo OEM bez tego ekranu.
  }
}
