# Niepuste kolejki GPS i operacji — test produkcyjnego buildu

Data: 2026-11-07. Werkit 1.9.4. Lokalny `next build` + `next start`, Chrome 157 i WebKit 27.2 (Playwright 1.65.0). Jednorazowy PostgreSQL 17, syntetyczna firma i dwa konta. Z bazy źródłowej odczytano tylko schemat; żadnych zapisów testowych do danych firmy. Bez płatnej rozbudowy.

## Wyniki

W obu silnikach przeszły:

1. Konto A otrzymuje dwa syntetyczne odczyty przez interfejs przeglądarkowego GPS i zapisuje dwie notatki przez formularz aplikacji. Aplikacja sama zapisuje 2 punkty i 2 operacje w IndexedDB; test nie dopisuje rekordów bezpośrednio do kolejek.
2. Wysyłka GPS i operacji jest zatrzymana na granicy fetch. Zamknięcie całego procesu przeglądarki i otwarcie tego samego profilu zachowuje wszystkie pola rekordów, właściciela oraz identyfikatory sesji.
3. A → B: B zapisuje własny punkt i notatkę, a cztery rekordy A pozostają bez zmian. Próba wysłania operacji A z konta B kończy się odmową 409 `offline_account_mismatch`.
4. B → A odtwarza kolejki A. Po przepuszczeniu żądań i zatwierdzeniu zapisów na serwerze test odrzuca odpowiedzi przed przekazaniem ich aplikacji. Punkty oraz operacje pozostają w kolejce.
5. Następny pełny restart nadal zachowuje rekordy. Po udostępnieniu odpowiedzi kolejki opróżniają się dopiero po potwierdzeniach. Każdy punkt trafia dokładnie raz do pierwotnej sesji i użytkownika; każda notatka oraz potwierdzenie operacji występuje dokładnie raz.

Dodatkowo Chrome przeszedł pełny restart **bez dostępu do serwera Werkit**. Po potwierdzeniu aktywnego service workera i gotowej migawki lokalna bramka zrywała wszystkie połączenia do aplikacji, również dla HTML, JS i API. Po ponownym uruchomieniu profil wyświetlił ekran z cache, zachowując niepuste kolejki. Po przywróceniu połączenia przeszedł pozostałe etapy scenariusza.

Wyniki maszynowe: `PILOT-QUEUES-CHROME-2026-11-07.json`, `PILOT-QUEUES-WEBKIT-2026-11-07.json`. Zawierają oryginalne rekordy oraz końcowy odczyt syntetycznej bazy; identyfikatory kolejnych przebiegów różnią się. Kontrolne odczyty bazy są niezależne od interfejsu i jego komunikatów.

## Wykryty i naprawiony błąd

WebKit dwukrotnie zatrzymał powrót B → A na ekranie „Brak połączenia”, mimo dostępnego serwera; nie stracił kolejek. Service worker rozsyłał `OFFLINE_ACCOUNT_CHANGED` również do karty, która właśnie logowała lub wylogowywała użytkownika. Obsługa tej wiadomości mogła uruchomić drugie przekierowanie i przerwać trwającą nawigację. Inicjująca karta ma własną obsługę nawigacji.

`authTransition` otrzymuje teraz `FetchEvent.clientId` i po pomyślnej odpowiedzi pomija tę kartę przy powiadamianiu. Pozostałe karty nadal otrzymują wiadomość, więc nie pozostają na ekranie starego konta. Przy nieudanym wylogowaniu offline inicjator nadal otrzymuje wiadomość, aby ukryć poprzednie konto — sprawdza to osobny test. Nie zmieniono trwałej blokady konta, właścicieli kolejek ani reguł serwera. Dwa nowe testy dla login/logout nie przechodziły przed poprawką i przechodzą po niej; pełny scenariusz WebKit przeszedł również po ponownym zbudowaniu aplikacji.

Pierwsza próba pełnego restartu offline była wykonana przed zakończeniem rejestracji service workera. Doprecyzowano warunek gotowości testu: aktywny worker kontrolujący stronę i istniejąca migawka. Dopiero po spełnieniu obu warunków odcięto serwer. Nie omijano błędów przez czyszczenie kolejki, mockowanie odpowiedzi API ani ponawianie niespełnionych asercji jako sukcesu.

## Granice

- GPS jest syntetycznym wejściem do prawdziwego watchera aplikacji, nie pomiarem fizycznego urządzenia. Nie testowano dokładności GPS, zablokowanego ekranu ani natywnego tła APK.
- WebKit działał na Windows; wynik nie zastępuje testu Safari na iPhonie. Pełny start bez serwera potwierdzono w Chrome. W WebKit testowano restarty z niepustą kolejką przy blokowaniu wysyłki GPS/operacji i dostępności stron oraz logowania.
- Operacje kolejki w tym scenariuszu to dwie notatki; zakończenie sesji, zdjęcia i konflikty edycji nie są objęte tym nowym przebiegiem.
- Dane przeglądarki mogą zostać usunięte przez użytkownika/system. Test nie daje gwarancji po takim usunięciu. Pierwsze przygotowanie PWA do pracy bez sieci wymaga połączenia.

## Powtórzenie

1. Wymagane Docker, Chrome i narzędzia Playwright/WebKit w `.pilot-drill/browser-tools` oraz `.pilot-drill/browser-engines`, jak w raporcie WebView/WebKit.
2. `node scripts/pilot-browser-server.mjs --production --network-gateway` tworzy izolowaną bazę i build. Aplikacja słucha wewnętrznie na 4319, bramka na 4317, kontrola wyłącznie na loopback 4318. `/queue-state` udostępnia odczyt kontrolny. POST `/network/off` i `/network/on` odcinają/przywracają wyłącznie testową bramkę.
3. Po gotowości: `node scripts/pilot-offline-queues-check.mjs chrome --full-offline`, następnie `node scripts/pilot-offline-queues-check.mjs webkit`.
4. Wyniki zapisują się w `.pilot-drill/queues-<silnik>-result.json`. Każdy przebieg tworzy osobny profil; restarty wewnątrz scenariusza używają tego samego profilu i nie czyszczą danych.
5. Utworzenie `.pilot-drill/browser-stop` zatrzymuje własne procesy i usuwa kontener bazy. Profile i wyniki pozostają lokalnie, poza Git.
