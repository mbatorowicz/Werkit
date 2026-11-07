# Odzyskanie starego profilu WebKit — 2026-11-07

Werkit 1.9.4. Lokalny build produkcyjny (`next build` + `next start`), WebKit 27.2 / Playwright 1.65.0 na Windows. Wyłącznie syntetyczna firma w jednorazowym PostgreSQL 17. Z bazy źródłowej pobrano tylko schemat w trybie read-only; bez danych firmy i bez płatnej rozbudowy.

## Przyczyna i poprawka

Na zachowanym profilu z poprzedniego testu logowanie nie docierało do API: service worker zwracał `FetchEvent.respondWith received an error: TypeError: Failed writing data to the file system`. Awaria dotyczyła zapisu metadanych konta przez Cache Storage, na który czekała funkcja `authTransition`. Poprzednia poprawka migawki danych nie obejmowała tego zapisu bezpieczeństwa.

Stan właściciela, ważności i blokady wylogowania ma teraz własny magazyn IndexedDB `werkit_offline_account`, niezależny od Cache Storage i wszystkich kolejek. Migracja zachowuje legacy owner i blocked; nie usuwa kolejek ani legacy metadanych. Blokada musi zostać zatwierdzona trwale przed żądaniem logowania/wylogowania. Przy awarii także tego magazynu operacja jest zatrzymywana, zamiast osłabiać izolację kont. Migawki odpowiedzi nadal używają Cache Storage; ograniczenie jego dostępności może ograniczać start całkowicie offline, ale nie odbiera poprawnej odpowiedzi sieci.

## Wykonana próba

Użyto dokładnie zachowanego profilu `1794038677483`, który wcześniej nie przechodził logowania. Przed pracą wykonano kopię całego katalogu profilu i odczyt istniejących kolejek. Nie wyrejestrowywano service workera, nie czyszczono danych przeglądarki ani IndexedDB. Zastosowano zwykłą aktualizację rejestracji service workera i przeładowanie strony.

- Odtworzono błąd na buildzie produkcyjnym przed poprawką.
- Po poprawce zaliczono logowanie A i odtworzenie formularza oczekującego pobrania.
- Zamknięto cały proces WebKit i uruchomiono ten sam profil: sesja i formularz odtworzone.
- Przełączono A → B → A: B nie widział formularza A; po powrocie A odzyskał tę samą ilość, notatkę i identyfikator operacji.
- Wykonano jeszcze jeden pełny restart i porównano wszystkie rekordy trzech baz kolejek.
- WZ, BOM i potwierdzenia pozostały równe 0, stan części 10.00. Odtworzenie formularza nie wysłało starego pobrania na nową bazę testową.

SHA-256 kanonicznego odczytu rekordów kolejek przed i po: `3202f8961bdf7e573d132c67e314fd85c0aa428acd225c396fe4e0384b0aae98`. `werkit_part_picks.pending` zawierał 1 wpis; `werkit_offline_queue.actions`, GPS i stopped_sessions były puste i pozostały puste. Nie jest to dowód dostarczenia niepustej kolejki GPS — test dotyczył uruchomienia i logowania bez utraty zastanych danych.

Wynik maszynowy: [PILOT-WEBKIT-RECOVERY-RESULT-2026-11-07.json](./PILOT-WEBKIT-RECOVERY-RESULT-2026-11-07.json). Wcześniejszy problem logowania tego profilu opisany w raporcie WebView/WebKit został w tym zakresie zamknięty. Nie testowano fizycznego iPhone’a ani wszystkich możliwych uszkodzeń magazynu przeglądarki.

## Regresja i powtórzenie

`serviceWorkerCache.test.ts` wykonuje rzeczywiste skrypty SW i sprawdza migrację starego właściciela, zachowanie offline-logout po migracji, start po restarcie, logowanie przy awarii Cache Storage, A/B, spóźnione odpowiedzi oraz odmowę wysłania logowania przy awarii trwałego IndexedDB. Testy nie zastępują pomiaru na urządzeniu.

1. Narzędzia jak w `TESTY-WEBVIEW-WEBKIT-2026-11-07.md`: Docker i Playwright/WebKit w `.pilot-drill`.
2. Uruchom `node scripts/pilot-browser-server.mjs --production`. Build i serwer otrzymują tylko izolowany URL bazy i losowy sekret testowy; log kompilacji: `.pilot-drill/browser-build.log`.
3. Uruchom `node scripts/pilot-webkit-recovery-check.mjs <profil-w-.pilot-drill> [zapis-kolejek-przed.json]`. Test wymaga produkcyjnego trybu serwera i istniejącego oczekującego pobrania. Opcjonalny zapis przed zmianą ma strukturę `{ databases: [...] }`. Nie tworzy wpisu kolejki i go nie wysyła.
4. Utwórz `.pilot-drill/browser-stop`, aby zatrzymać własny serwer i usunąć jednorazową bazę. Profile i kopie pozostają zachowane lokalnie, poza Git.
