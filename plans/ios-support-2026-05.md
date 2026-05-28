# iOS Support dla Werkit — analiza możliwości

## Status: Analiza (brak Maca — ograniczenie sprzętowe)

---

## 1. Obecny stan projektu

Werkit jest już aplikacją **hybrydową (Capacitor + PWA)**:

- [`capacitor.config.ts`](../capacitor.config.ts) — skonfigurowany dla Android (`com.werkit.app`)
- Działa jako **WebView** ładujący `https://werkit.cncsolutions.dev/`
- Używa natywnych wtyczek Capacitor:
  - [`@capacitor/android`](../package.json:36) — Android
  - [`@capacitor/app`](../package.json:37) — lifecycle
  - [`@capacitor/local-notifications`](../package.json:39) — powiadomienia
  - [`@capacitor-community/background-geolocation`](../package.json:35) — GPS w tle
  - [`@capgo/capacitor-native-biometric`](../package.json:40) — biometria
- Android build pipeline: [`.github/workflows/android-build.yml`](../.github/workflows/android-build.yml)
- PWA: [`public/manifest.webmanifest`](../public/manifest.webmanifest) + [`public/sw.js`](../public/sw.js)

---

## 2. Co jest potrzebne do iOS

### 2.1 Wymagania sprzętowe (BEZ DYSKUSJI)

| Wymóg | Status |
|-------|--------|
| **Mac (macOS)** z Xcode 16+ | ❌ **Nie masz** |
| Konto Apple Developer ($99/rok) | ✅ Masz |
| iPhone do testów | ? |

**Bez Maca nie da się zbudować IPA ani przesłać do App Store.**  
Xcode działa tylko na macOS. Nie ma chmurowego builda iOS, który zastąpiłby lokalny Xcode w 100% (są usługi jak MacStadium, ale to dodatkowy koszt).

### 2.2 Wtyczki Capacitor — kompatybilność iOS

Większość wtyczek Capacitor działa na iOS, ale są wyjątki:

| Wtyczka | iOS | Uwagi |
|---------|-----|-------|
| `@capacitor/app` | ✅ | |
| `@capacitor/local-notifications` | ✅ | |
| `@capgo/capacitor-native-biometric` | ✅ | Face ID / Touch ID |
| `@capacitor-community/background-geolocation` | ⚠️ | Działa, ale iOS ma ostrzejsze limity GPS w tle (tylko ~10 min w standardowym trybie, potem "significant change" lub region monitoring) |

### 2.3 Różnice Android vs iOS

| Obszar | Android | iOS |
|--------|---------|-----|
| GPS w tle | Możliwe z `FOREGROUND_SERVICE` | Ograniczone do ~10 min, potem tylko znaczące zmiany |
| Powiadomienia | Działają zawsze | Wymagają zgody użytkownika (push notification entitlement) |
| Biometria | Odciski palców / twarz | Face ID / Touch ID |
| Back button | Sprzętowy / systemowy | Brak — gest swipe |
| Dystrybucja | APK / AAB (dowolny sklep) | Tylko App Store (lub sideload przez Xcode) |
| Build | GitHub Actions (Linux) | Tylko macOS + Xcode |

---

## 3. Opcje udostępnienia na iOS

### Opcja A: Pełna aplikacja Capacitor (IPA → App Store)

**Proces:**
1. Zainstalować `@capacitor/ios` (`npx cap add ios`)
2. Skonfigurować natywne uprawnienia iOS (Info.plist: NSLocationAlwaysAndWhenInUseUsageDescription, NSFaceIDUsageDescription, itp.)
3. Zbudować na Macu przez Xcode → IPA
4. Przesłać do App Store Connect przez Xcode lub Transporter

**Problem:** Wymaga Maca. ❌

**Obejście:** Można wynająć Maca w chmurze:
- **MacStadium** — ~$100/miesiąc
- **GitHub Actions macOS runner** — tylko do CI, nie do ręcznej pracy
- **AWS Mac instances** — ~$1.50/godzina

### Opcja B: Tylko PWA (bez natywnej aplikacji)

**Co to znaczy:**
- Użytkownicy iOS dodają Werkit do ekranu głównego przez Safari → "Dodaj do ekranu głównego"
- Działa w standalone (bez paska adresu) dzięki [`manifest.webmanifest`](../public/manifest.webmanifest) (`display: standalone`)
- Push notifications przez Safari (od iOS 16.4+)

**Ograniczenia PWA na iOS:**
- ❌ Brak GPS w tle (tylko gdy aplikacja jest aktywna)
- ❌ Brak natywnej biometrii (ale można użyć WebAuthn)
- ❌ Brak lokalnych powiadomień push (Safari push wymaga serwisu push + iOS 16.4+)
- ✅ Działa od razu — nie wymaga Maca ani App Store

### Opcja C: PWA + ograniczona funkcjonalność (zalecana na teraz)

**Strategia:**
1. Udostępnić Werkit jako PWA na iOS (działa od razu — Safari otworzy stronę)
2. Dodać wykrywanie iOS i wyświetlić instrukcję "Dodaj do ekranu głównego"
3. Funkcjonalności wymagające natywnego API (GPS w tle, biometria) działają tylko na Androidzie
4. W przyszłości — gdy pojawi się Mac — dodać natywną aplikację iOS

---

## 4. Plan działania (bez Maca)

### Krok 1: Ulepszenie PWA dla iOS
- Dodać `apple-touch-icon` (ikony dla iOS)
- Dodać meta tagi `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
- Dodać `splash screens` dla iOS
- Dodać wykrywanie iOS z komunikatem "Dodaj do ekranu głównego"

### Krok 2: Adaptacja kodu dla iOS WebKit
- Sprawdzić czy `navigator.geolocation` działa w tle (nie będzie — to ograniczenie iOS)
- Dodać fallback dla biometrii: jeśli `@capgo/capacitor-native-biometric` niedostępny → użyć hasła/pinu
- Dodać obsługę gestów iOS (swipe back)

### Krok 3: Przygotowanie na przyszłość (gdy pojawi się Mac)
- Dodać `@capacitor/ios` do projektu (samo dodanie nie wymaga Maca)
- Skonfigurować `Info.plist` z opisami uprawnień
- Dodać iOS build do CI (macOS runner w GitHub Actions)

---

## 5. Podsumowanie

| Aspekt | Obecnie | Po zmianach |
|--------|---------|-------------|
| Działa na iOS przez Safari | ✅ Tak | ✅ Tak |
| PWA "Dodaj do ekranu głównego" | ⚠️ Działa, ale bez iOS-optymalizacji | ✅ Pełna obsługa |
| GPS w tle | ❌ | ❌ (ograniczenie iOS) |
| Biometria | ❌ | ❌ (wymaga natywnej aplikacji) |
| Push notifications | ❌ | ⚠️ Safari push (ograniczone) |
| App Store | ❌ | ❌ (wymaga Maca) |

**Rekomendacja:** Na ten moment — **PWA z ulepszeniami dla iOS**.  
To jedyna opcja bez Maca. Działa od razu, nie wymaga dodatkowych kosztów, a użytkownicy mogą dodać Werkit do ekranu głównego w Safari.

Gdy w przyszłości pojawi się dostęp do Maca — dodać natywną aplikację iOS przez Capacitor i wrzucić do App Store.
