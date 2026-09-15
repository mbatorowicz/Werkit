# Google Play — publikacja Werkit

Pakiet `com.werkit.app`, nazwa **Werkit**. AAB z CI: artefakt `werkit-app-release-bundle` (`app-release.aab`).

Polityka prywatności (publiczna, bez logowania):
`https://werkit.cncsolutions.dev/privacy-policy`

Szczegóły recenzji: [`store/google-play/`](../store/google-play/).

**Co zostało do produkcji (stan 2026-09-15):** [`store/google-play/pozostale.md`](../store/google-play/pozostale.md) — AAB 1.9.4 jest na teście wewnętrznym; brakuje zrzutów, filmu GPS, listingu w Konsoli, Data safety, deklaracji uprawnień i wniosku o produkcję.

---

## 1. Co jest już w repo

| Wymaganie Play (2026) | Stan w Werkit |
|-----------------------|---------------|
| targetSdk **36** | `android/variables.gradle` |
| AAB (`bundleRelease`) | workflow `android-build.yml` |
| versionName / versionCode z `package.json` | `1.9.4` → `10904` |
| HTTPS, bez cleartext w release | `usesCleartextTraffic=false` |
| Ikona 512 + feature graphic 1024×500 | `store/google-play/` (`npm run icons:generate`) |
| Disclosure GPS w tle | modal workera + `/privacy-policy` |
| 16 KB (paczka native) | `useLegacyPackaging = false` (AGP 8.13) |

**Blokada publikacji bez Twojej akcji:** klucz uploadu w GitHub Secrets oraz konto Play Console.

---

## 2. Klucz uploadu (jednorazowo)

Google Play App Signing: **Ty** trzymasz *upload key*, Google trzyma *app signing key*. Utrata upload key = procedura resetu w Konsoli.

1. Na maszynie z JDK: `npm run android:play-keystore`
2. Powstaną (poza Gitem): `android/upload-keystore.jks`, `android/keystore.properties`, `android/.upload-keystore.env`
3. **Kopia zapasowa** tych trzech plików na nośnik offline (nie Slack, nie repo).
4. GitHub → Settings → Secrets and variables → Actions:

| Secret | Wartość |
|--------|---------|
| `ANDROID_KEYSTORE_BASE64` | PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("android\upload-keystore.jks"))` — **jedna linia Base64**, bez nagłówków `-----BEGIN` |
| `ANDROID_KEYSTORE_PASSWORD` | `WERKIT_UPLOAD_KEYSTORE_PASSWORD` z `.upload-keystore.env` |
| `ANDROID_KEY_ALIAS` | `werkit-upload` |
| `ANDROID_KEY_PASSWORD` | to samo co `ANDROID_KEYSTORE_PASSWORD` (PKCS12 nie obsługuje dwóch haseł) |

5. `workflow_dispatch` na **Build Android App**. W logu nie może być ostrzeżenia o braku keystore. W `werkit-apk-meta.json`: `"signing": "play-upload"`.

Bez sekretów CI nadal buduje release **podpisany debug** (sideload). Tego AAB **nie** wgrywaj do Play.

**Istniejące instalacje sideload** (podpis debug) **nie zaktualizują się** z wersji ze Sklepu — użytkownik odinstalowuje starą apkę i instaluje z Play.

---

## 3. Play Console — checklista pierwszego wrzucenia

Konto dewelopera Google Play (opłata jednorazowa), aplikacja **Werkit**, pakiet `com.werkit.app`.

1. **Utwórz aplikację** → kategoria *Business* / *Productivity*, darmowa, bez reklam.
2. **Play App Signing** — zostaw domyślne (Google chroni klucz podpisu).
3. **Wgraj AAB** z artefaktu CI (Internal testing → potem Production).
4. **Zasady danych / Data safety** — wypełnij według [`store/google-play/data-safety.md`](../store/google-play/data-safety.md).
5. **Uprawnienia wrażliwe** (deklaracje):
   - *Background location* — funkcja podstawowa: ślad GPS **tylko w aktywnej sesji** pracy (nie tracker 24/7).
   - *All the time* + film: start sesji → telefon w kieszeni / zgaszony ekran → trasa w panelu admina.
   - *REQUEST_IGNORE_BATTERY_OPTIMIZATIONS* — GPS przy zgaszonym ekranie w sesji.
   - *SCHEDULE_EXACT_ALARM* — przypomnienia o zleceniach (`LocalNotifications`).
6. **Treści sklepu** — teksty w [`store/google-play/listing-pl.md`](../store/google-play/listing-pl.md) / [`listing-en.md`](../store/google-play/listing-en.md); grafika z tego folderu; **min. 2 zrzuty telefonu** (zrób z urządzenia: logowanie, dyspozycja, sesja z mapą).
7. **URL polityki:** `https://werkit.cncsolutions.dev/privacy-policy`
8. **Ocena treści** — kwestionariusz (narzędzie pracy, 18+ jeśli pytają o lokalizację pracowników).
9. **Target audience** — dorośli, nie dzieci.
10. **News / COVID / finansowe** — nie.

Recenzja z lokalizacją w tle trwa zwykle dłużej (dni, nie godziny). Odrzucenie „WebView wrapper”: w odpowiedzi wskaż natywny GPS, biometrię, alarmy i politykę sesji — to nie jest sama zakładka przeglądarki.

---

## 4. Wersjonowanie

`package.json` `version` jest SSOT. Gradle: `versionCode = major*10000 + minor*100 + patch`. Każde wrzucenie do Play wymaga **wyższego** `versionCode` — podbij semver w `package.json` przed builodem.

---

## 5. Po publikacji

- Link sklepu można podać w `/admin/settings` zamiast (lub obok) sideload APK.
- Produkcyjny URL w `capacitor.config.ts` musi być tym, którego używają klienci; zmiana URL = nowy AAB.
