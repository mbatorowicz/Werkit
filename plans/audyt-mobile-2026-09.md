# Audyt aplikacji na telefon — Werkit (2026-09)

> **Data:** 15 września 2026  
> **Wersja kodu:** `1.9.4`  
> **Zakres:** przegląd statyczny Capacitor Android + PWA workera. Bez testu na fizycznym urządzeniu z zgaszonym ekranem.  
> **Powiązane:** [`docs/SYSTEM_MAP.md`](../docs/SYSTEM_MAP.md) §14, [`AGENTS.md`](../AGENTS.md) §7, [`docs/TECH_DEBT_ROADMAP.md`](../docs/TECH_DEBT_ROADMAP.md) §5 (`P-MOBILE`).

---

## Werdykt

**APK da się używać w terenie. PWA — nie.**

Ścieżka produkcyjna to cienka powłoka Capacitor: WebView ładuje Next.js z `https://werkit.cncsolutions.dev/`. Natywny GPS, kolejka IndexedDB i powiązanie śladu z aktywną sesją są spójne z kontraktem produktu. Drugi kanał — „dodaj do ekranu głównego” w Chrome — jest zepsuty (brak `manifest.json`, brak ikon, Service Worker nie przechodzi `install`).

| Waga | Liczba | ID |
|------|--------|-----|
| P0 krytyczne | 1 | M-1 |
| P1 wysokie | 6 | M-2 … M-7 |
| P2 średnie | 6 | M-8 … M-13 |
| P3 niskie | 5 | M-14 … M-18 |

---

## Jak telefon naprawdę działa

To nie jest natywna aplikacja z ekranami w Javie. `MainActivity` to mostek Capacitor. UI, sesja, zlecenia i mapa żyją w zdalnym Next.js.

Wtyczki natywne: `@capacitor-community/background-geolocation`, `@capacitor/local-notifications`, `@capgo/capacitor-native-biometric`, `@capacitor/app` (przycisk wstecz).

```
APK (BridgeActivity)
  └─ WebView → https://werkit.cncsolutions.dev/
        ├─ /worker (Next.js)
        ├─ BackgroundGeolocation → GPSManager (IndexedDB) → POST /api/worker/gps
        ├─ LocalNotifications (alarmy)
        └─ NativeBiometric (Keystore, tag com.werkit.app.auth)
```

| Warstwa | Co robi | Werdykt |
|---------|---------|---------|
| APK Capacitor | WebView → `https://werkit.cncsolutions.dev/` | Cienka powłoka, jeden tenant na build |
| GPS native | Foreground service + filtr 40 m / 10 m | Solidne; flush też przy nowej próbce |
| GPS web / PWA | `watchPosition` bez filtra accuracy | Szpilki na trasie |
| Kolejka GPS | IndexedDB + `keepalive` + chunk 200 | Solidne |
| Sesja | Serwer zapisuje GPS tylko przy `IN_PROGRESS` | Zgodne z kontraktem |
| Auth | JWT cookie `SameSite=None`; CSRF ufa originowi i `capacitor://` | Dopasowane do WebView |
| PWA / SW | `public/sw.js`, pre-cache brakującego manifestu | Install pada |
| Alarmy | Tick JS 30 s, potem LocalNotifications `+500 ms` | Zawodne przy zgaszonym ekranie |

**Poza zakresem tego przeglądu:** jazda z APK w kieszeni, pomiar ubytku próbek na OEM (Xiaomi / Samsung Doze), sprawdzenie czy produkcyjny `/manifest.json` nie jest serwowany poza repo (CDN). Do domknięcia na urządzeniu: sesja w tle 20 min z zgaszonym ekranem, alarm zaległego zlecenia, instalacja PWA z Chrome.

---

## Rejestr znalezisk

| ID | Waga | Obszar | Problem | Skutek |
|----|------|--------|---------|--------|
| M-1 | P0 | PWA | Instalacja PWA nie działa | Brak `public/manifest.json` i ikon; SW w `install` robi `cache.addAll('/manifest.json')` — jeden 404 wali całą instalację workera |
| M-2 | P1 | Dystrybucja | W teren idzie debug APK | CI buduje też release, ale GitHub Release `android-latest` publikuje `app-debug.apk` |
| M-3 | P1 | Capacitor | Jeden URL wszyty w APK | `capacitor.config.ts` ładuje wyłącznie `https://werkit.cncsolutions.dev/`. Inny tenant wymaga osobnego builda |
| M-4 | P1 | Alarmy | Powiadomienia zależą od `setInterval` | Detekcja alarmu co 30 s w JS; LocalNotifications dopiero potem, z `at: now+500 ms` |
| M-5 | P1 | GPS | PWA bez filtra dokładności 40 m | Natywny watcher odrzuca szpilki; `watchPosition` zapisuje surowe punkty |
| M-6 | P1 | Android | Dialog baterii przy cold start | `MainActivity` pyta o wyłączenie optymalizacji, dopóki użytkownik nie zaakceptuje |
| M-7 | P1 | CI | APK nie przebudowuje się po zmianach workera | Workflow startuje tylko przy `android/**`, `capacitor.config.ts`, `package.json` |
| M-8 | P2 | Bezpieczeństwo | Cleartext HTTP w manifeście | `usesCleartextTraffic=true` mimo docs, że flaga została zdjęta |
| M-9 | P2 | Bezpieczeństwo | Backup Androida włączony | `allowBackup=true` — sesja WebView może wylecieć w kopii OEM |
| M-10 | P2 | Bezpieczeństwo | FileProvider zbyt szeroki | `external-path path="."` udostępnia cały storage zewnętrzny |
| M-11 | P2 | Prywatność | Logi z dokładnymi współrzędnymi | Odrzucone szpilki GPS idą do `device_logs` z `lat`/`lng` |
| M-12 | P2 | Auth | Biometria trzyma hasło | Keystore trzyma plaintext hasła, nie token urządzenia |
| M-13 | P2 | PWA | SWR cache sesji (utajone) | Po naprawie SW GET session/orders/settings pójdzie stale-while-revalidate |
| M-14 | P3 | Platforma | Brak iOS | Tylko Android Capacitor. iPhone = przeglądarka / zepsuta PWA |
| M-15 | P3 | Android | Brak App Links | APK otwiera się tylko z ikony |
| M-16 | P3 | Docs | SYSTEM_MAP §14 był nieaktualny | GPS queue = IndexedDB; wstecz = własny stos. **Poprawione w tym samym commicie co ten audyt** (pozostaje jako zapis stanu na dzień przeglądu). |
| M-17 | P3 | Build | R8 wyłączony w release | `minifyEnabled false` |
| M-18 | P3 | Aparat | Zdjęcia przez `input file` | Brak `@capacitor/camera` — UX zależy od OEM WebView |

---

## P0 — krytyczne

### M-1 — PWA nie wstaje

**Dowód:**

- [`src/app/layout.tsx`](../src/app/layout.tsx) — `manifest: "/manifest.json"`
- [`public/manifest.webmanifest`](../public/manifest.webmanifest) — ścieżki `../icons/icon-*.webp`; katalogu `public/icons/` nie ma
- [`public/sw.js`](../public/sw.js) — `STATIC_ASSETS` zawiera `'/manifest.json'`; `cache.addAll` przy jednym 404 odrzuca cały `install`

**Skutek:** „Dodaj do ekranu głównego” w Chrome pada. Offline, background sync i pre-cache dźwięków nie działają. Dla APK to mniej boli (WebView ładuje HTTPS bez PWA). Dla pracownika bez APK kanał jest martwy.

**Naprawa:** dodać `public/manifest.json` (albo rewrite), wygenerować ikony PNG 192/512, poprawić ścieżki, wyjąć 404-owe URL-e z `cache.addAll`. Po ożywieniu SW przełączyć GET sesji na network-first (M-13).

---

## P1 — wysokie (teren i dystrybucja)

### M-2 — debug APK w release GitHub

**Dowód:** [`.github/workflows/android-build.yml`](../.github/workflows/android-build.yml) — `assembleRelease` + `assembleDebug`, potem `cp …/app-debug.apk werkit.apk`.

**Skutek:** admin pobiera debug z karty w ustawieniach. Brak pełnego hardeningu, łatwiejszy reverse, Play Protect ostrzega.

**Naprawa:** publikować podpisany `assembleRelease`; debug zostawić na CI artifacts.

### M-3 — jeden URL w native config

**Dowód:** [`capacitor.config.ts`](../capacitor.config.ts) — `server: { url: 'https://werkit.cncsolutions.dev/' }`.

**Skutek:** platforma ma wielu tenantów, APK jednego. Pracownik innej firmy, który zainstaluje uniwersalny plik, trafi na zły backend.

**Naprawa:** flavor per domenę w CI albo pierwszy ekran wyboru instancji (z allowlistą).

### M-4 — alarmy czekają na JS

**Dowód:**

- [`src/features/worker/hooks/useWorkerNotifications.ts`](../src/features/worker/hooks/useWorkerNotifications.ts) — `setInterval(tick, 30_000)`
- [`src/features/worker/lib/scheduleWorkerAlarmNotification.ts`](../src/features/worker/lib/scheduleWorkerAlarmNotification.ts) — `schedule: { at: new Date(Date.now() + 500) }`

**Skutek:** natywne powiadomienie schodzi dopiero gdy JS stwierdzi, że alarm już trwa. To nie jest zaplanowany alarm na `dueDate`. Android może uśpić timer; dzwonek spóźnia się do przebudzenia WebView. GPS ma częściową osłonę (callback natywnego watchera + flush od razu). Alarmy nie mają.

**Naprawa:** harmonogramować `LocalNotifications` na `dueDate` z wyprzedzeniem; tick JS zostawić jako uzupełnienie na pierwszym planie. Na PWA — Web Push / Notification API w SW.

### M-5 — PWA bez filtra dokładności 40 m

**Dowód:**

- Native: [`src/features/worker/gps/coordFromNativeReading.ts`](../src/features/worker/gps/coordFromNativeReading.ts) — odrzut `accuracy > 40`
- Web: [`src/features/worker/hooks/useWorkerGPS.ts`](../src/features/worker/hooks/useWorkerGPS.ts) — surowe `watchPosition` → `handleNewLoc`

**Naprawa:** ten sam filtr accuracy w `handleNewLoc` dla web.

### M-6 — dialog baterii przy cold start

**Dowód:** [`android/app/src/main/java/com/werkit/app/MainActivity.java`](../android/app/src/main/java/com/werkit/app/MainActivity.java) — `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` gdy `!isIgnoringBatteryOptimizations`.

**Skutek:** po akceptacji milczy. Po odmowie pyta przy każdym cold start. Irytacja w terenie; ryzyko, że ktoś zablokuje uprawnienie na stałe. Google Play może flagować to uprawnienie.

**Naprawa:** dialog po starcie sesji GPS, z wyjaśnieniem w UI — nie w `onCreate` bez kontekstu.

### M-7 — CI Androida nie widzi zmian workera

**Dowód:** [`.github/workflows/android-build.yml`](../.github/workflows/android-build.yml) — `paths:` tylko `android/**`, `capacitor.config.ts`, `package.json`, sam workflow.

**Skutek:** remote WebView dostaje nowy JS po deployu, ale wtyczki zostają w starym APK. Panel admina pokazuje `inSync === false`.

**Naprawa:** po zmianie mostka GPS / powiadomień / biometrii ręczny `workflow_dispatch`; rozważyć trigger przy zmianach `src/features/worker/gps/**`.

---

## P2 — średnie

### M-8 — cleartext HTTP

[`android/app/src/main/AndroidManifest.xml`](../android/app/src/main/AndroidManifest.xml) — `android:usesCleartextTraffic="true"`. SYSTEM_MAP §14 mówi, że flaga została zdjęta. W produkcji: `false`; cleartext tylko w debug / network security config dla LAN.

### M-9 — `allowBackup="true"`

Backup OEM może objąć dane WebView / cookies. Ustawić `false` albo exclude rules.

### M-10 — FileProvider

[`android/app/src/main/res/xml/file_paths.xml`](../android/app/src/main/res/xml/file_paths.xml) — `<external-path name="my_images" path="." />`. Zawęzić do cache/files aplikacji.

### M-11 — logi GPS z współrzędnymi

[`useWorkerGPS.ts`](../src/features/worker/hooks/useWorkerGPS.ts) loguje `lat`/`lng` przy odrzuceniu szpilki. Redagować (zaokrąglenie) albo nie logować pozycji.

### M-12 — biometria z hasłem

[`src/lib/biometricLogin.ts`](../src/lib/biometricLogin.ts) — `setCredentials({ username, password })`. Standard wielu app, ale wyższe ryzyko niż device-bound refresh token.

### M-13 — SWR cache sesji (utajone)

[`public/sw.js`](../public/sw.js) — stale-while-revalidate dla `/api/worker/session`, `work-orders`, `settings`. Dziś SW i tak nie wstaje (M-1). Po naprawie M-1: network-first z timestampem „stan z …”.

---

## P3 — niskie

| ID | Temat | Uwaga |
|----|-------|--------|
| M-14 | Brak iOS | Osobny program; zob. [`plans/ios-support-2026-05.md`](./ios-support-2026-05.md) |
| M-15 | Brak App Links | Intent-filter dla `/worker/...` gdy będzie potrzeba z SMS/e-mail |
| M-16 | SYSTEM_MAP §14 | GPS queue = IndexedDB (`gpsManager.ts`); wstecz = własny stos w `CapacitorBackButton.tsx`. **§14 zsynchronizowany** przy zapisie tego audytu. |
| M-17 | `minifyEnabled false` | Włączyć R8 po teście release |
| M-18 | Brak Camera plugin | `<input type="file" capture="environment">` — świadomy kompromis |

---

## Co już jest solidne

Nie wymyślać tu problemów. Warstwa field-ops na APK ma kilka rzeczy zrobionych świadomie:

| Obszar | Dowód |
|--------|-------|
| GPS tylko w aktywnej sesji | Watcher przy `session` + `gpsPolicy !== stationary` + `gpsTrackingEnabled`; serwer `no_active_session` |
| Geofence off nie gasi trackera | `shouldStartGpsWatcher.ts`, niezależne flagi |
| Kolejka IndexedDB + keepalive | `gpsManager.ts`, `GPS_MAX_POINTS_PER_REQUEST = 200` |
| Flush przy powrocie na kartę | `useWorkerSessionSync.ts` — polling tylko gdy `visible` |
| Cookie pod WebView | `authCookie.ts` — SameSite=None + Secure; kasowanie z tymi samymi atrybutami |
| CSRF | `csrfGuard.ts` — origin strony + `capacitor://localhost` |
| Hardware back | jeden listener, własny stos ścieżek, `App.minimizeApp()` na root |
| Limity S2 | foto 4 MiB + MIME; logi 30/min; GPS 200 pkt + bbox |
| GlobalErrorHandler | `worker/layout.tsx` |
| Ostrzeżenie wersji web vs APK | `AppDownloadCard`, `androidAppDownload.ts` |

---

## Kolejność napraw

| Krok | ID | Dlaczego teraz |
|------|-----|----------------|
| 1 | M-1 | Odblokowuje PWA i przestaje psuć SW install |
| 2 | M-2 | Przestaje iść debug do ludzi w terenie |
| 3 | M-4 | Alarmy mają działać przy zgaszonym ekranie |
| 4 | M-5 | Ten sam filtr GPS na web i native |
| 5 | M-8–M-10 | Hartowanie manifestu (cleartext, backup, FileProvider) |
| 6 | M-13 | Gdy SW wstanie — network-first dla sesji |
| 7 | M-16 | SYSTEM_MAP §14 do kodu |

---

## Checklista testu terenowego (gdy będą poprawki)

- [ ] Sesja `machine_work` z GPS, ekran zgaszony 20 min — punkty w `gps_logs`
- [ ] Sesja stacjonarna — watcher nie startuje
- [ ] Alarm zaległego zlecenia przy zablokowanym ekranie (APK)
- [ ] Chrome: „Dodaj do ekranu głównego” — ikona i standalone
- [ ] Pobranie APK z `/admin/settings` — badge release, nie debug
- [ ] Hardware back: wizard → lista → minimize, nie wyjście z apki
- [ ] Biometria: login po restarcie procesu
- [ ] Zdjęcie sesji offline, potem online — upload z kolejki
