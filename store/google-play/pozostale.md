# Google Play — co zostało (2026-09-15)

Konsola: konto **cncSolutions**, aplikacja **Werkit**, pakiet `com.werkit.app`.

**Gotowe:** AAB **1.9.4** (kod **10904**) na teście wewnętrznym, ścieżka aktywna, tester `mbatorowicz@gmail.com`. W repo: listingi PL/EN, Data safety, ikona 512, feature graphic (`store/google-play/`).

Test wewnętrzny: https://play.google.com/apps/internaltest/4701466547614975716

Panel aplikacji: https://play.google.com/console/u/0/developers/5359970820590308834/app/4972099642758882688/app-dashboard

---

## 1. Telefon (blokuje recenzję GPS)

- Odinstaluj sideload (podpis debug), dołącz do testu linkiem powyżej (konto Google `mbatorowicz@gmail.com`).
- **Min. 2 zrzuty telefonu:** logowanie, dyspozycja, sesja z mapą.
- **Film GPS w tle:** start sesji → telefon w kieszeni / zgaszony ekran → trasa w panelu admina.
- Kopia zapasowa `android/upload-keystore.jks` + `keystore.properties` + `.upload-keystore.env` na nośnik offline (nie Slack, nie Git).

## 2. Konsola — strona sklepu i deklaracje

Wypełnić z repo (materiały w tym folderze):

- Listing PL/EN, ikona, feature graphic, zrzuty z pkt 1.
- URL polityki: `https://werkit.cncsolutions.dev/privacy-policy`
- Data safety wg [`data-safety.md`](./data-safety.md)
- Grupa docelowa: dorośli, nie dzieci. Brak reklam / news / COVID / finansów.
- Ocena treści (kwestionariusz).
- Deklaracje: lokalizacja w tle (sesja, nie flota 24/7), ignorowanie oszczędzania baterii, dokładne alarmy. Do tła GPS — film z pkt 1.

## 3. Konsola — tożsamość i produkcja

- Weryfikacja dewelopera Androida (menu konta) — bez niej produkcja często stoi.
- Test zamknięty (wymagany przed dostępem produkcyjnym).
- Wniosek o publikację produkcyjną.
- Recenzja z GPS w tle: zwykle **dni**, nie godziny.

## 4. Po akceptacji w Sklepie

- Link Play w `/admin/settings` obok (lub zamiast) sideload APK.
- Kolejny AAB tylko po podbiciu `version` w `package.json`.

---

**Kolejność:** instalacja + zrzuty + film → listing i deklaracje → zamknięty test i wniosek o produkcję.

Szersza procedura: [`docs/GOOGLE_PLAY.md`](../../docs/GOOGLE_PLAY.md).
