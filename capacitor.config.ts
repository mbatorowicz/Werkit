import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.werkit.app',
  appName: 'Werkit',
  webDir: 'public',
  // Dla aplikacji Next.js, która wymaga serwera Node (nie jest w 100% statyczna),
  // używa się wzorca WebView ładującego zewnętrzny URL, zachowując dostęp do natywnych wtyczek.
  // Aby testować na telefonie lokalnie podłączonym do tego samego WiFi, użyj lokalnego IP:
  // server: { url: 'http://192.168.0.x:3000', cleartext: true }
  // Docelowo podmień na prawdziwą domenę np. https://twoja-domena.pl
};

export default config;
