import { registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

/** Jedna rejestracja wtyczki na bundel — importuj ten moduł tylko z worker (GPS). */
export const backgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");
