# Test fizycznego Androida przez USB — 2026-11-07

Werkit 1.9.4. Telefon Xiaomi 17T Pro, Android 16 (SDK 36), Android System WebView 156.0.8078.47. Testowano lokalny produkcyjny build Next.js (`next build` + `next start`) i odizolowany PostgreSQL 17 z syntetyczną firmą oraz kontami A i B. Z bazy źródłowej pobrano wyłącznie schemat. Bez płatnych usług i bez zapisów do danych firmy.

## Potwierdzone wyniki

- **Części, utracona odpowiedź:** serwer zatwierdza pobranie 2 sztuk, odpowiedź jest odrzucana przed dostarczeniem aplikacji. Pełne zatrzymanie procesu aplikacji i ponowne uruchomienie odtwarzają formularz i klucz żądania. Konto B nie przejmuje formularza A. Powrót B → A i ponowienie zachowują magazyn: 8 → 6 po pierwszym pobraniu, nadal 6 po ponowieniu; liczba WZ, pozycji i potwierdzeń pozostaje 2.
- **Części, brak wysłania:** żądanie zostaje zatrzymane przed serwerem. Restart zachowuje formularz. Ponowienie wykonuje pobranie dokładnie raz: 6 → 4, po jednym dodatkowym WZ, wpisie i potwierdzeniu.
- **Niepuste kolejki:** 2 syntetyczne odczyty GPS i 2 notatki trafiają przez interfejs aplikacji do prawdziwych kolejek IndexedDB. Pełny restart zachowuje wszystkie pola, właściciela oraz sesję.
- **Pełny restart bez serwera:** po potwierdzeniu aktywnego service workera i zapisanej migawki bramka odcina wszystkie połączenia do aplikacji (HTML, JS, API). Aplikacja po restarcie otwiera ekran z cache, a niepuste kolejki pozostają identyczne. Nie wyłączano Wi-Fi ani transmisji danych całego telefonu.
- **Zmiana konta:** A → B → A zachowuje kolejki A. B synchronizuje własny punkt i notatkę, a próba wysłania operacji A z konta B otrzymuje 409. Nie przypisuje cudzych danych do B.
- **Utrata odpowiedzi i kolejny restart:** po zatwierdzeniu GPS/operacji na serwerze odpowiedzi zostają odrzucone. Rekordy pozostają w kolejce również po zamknięciu procesu. Po ponownej synchronizacji każdy punkt i każda notatka występują dokładnie raz, w pierwotnej sesji i na właściwym koncie.

Wyniki z niezależnym odczytem bazy: `PILOT-USB-PARTS-2026-11-07.json` i `PILOT-USB-QUEUES-2026-11-07.json`. Pierwszy zawiera stan początkowy po jednej wcześniejszej, rozliczonej próbie; asercje sprawdzają dokładne przyrosty względem tego stanu. W drugim końcowy odczyt bazy zawiera też poprzedni przebieg; identyfikatory operacji i prefiksy notatek jednoznacznie rozdzielają próby.

## Wykryta poprawka i przebieg diagnostyki

Lista wyboru części używała wysokości visual viewport do obliczania CSS `bottom`, chociaż pozycjonowanie `fixed` jest względem layout viewport. Przy otwartej klawiaturze oraz przesuniętym widoku lista mogła trafić w inne miejsce. `floatingPanelPosition` uwzględnia teraz `visualViewport.offsetTop` przy wyborze kierunku i dostępnej przestrzeni, a `innerHeight` przy wyliczaniu `bottom`. Dwa nowe testy odtwarzają zmniejszenie i przesunięcie widoku przez klawiaturę. Po poprawce wybór części przeszedł na telefonie.

Pierwsze próby nie zakończyły całego scenariusza: narzędzie testowe miało problemy ze współrzędnymi przy otwartej klawiaturze i przechowywało połączenie do zakończonego WebView. Adapter używa teraz obsługi Android WebView, odświeża połączenie przy każdym restarcie, a formularze kończą edycję i czekają na schowanie klawiatury przed zatwierdzeniem. Nie używa `force: true` ani programowego wyboru opcji do omijania kontroli kliknięć. Zachowane pobrania były potwierdzane zwykłym ponowieniem; odczyt magazynu potwierdził brak kolejnego rozchodu. Nie kasowano kolejki w celu uzyskania sukcesu.

## Zakres i ograniczenia

To **rzeczywisty telefon i WebView**, ale osobna aplikacja **Werkit USB test** (`com.werkit.pilot.usbtest.p20261107`), nie produkcyjny APK Capacitor. Nie nadpisano zwykłego Werkit ani innych aplikacji; nie używano `pm clear`, odinstalowania ani resetu telefonu. Aktualizacja wyłącznie testowego pakietu zachowała jego dane. Aplikacja testowa i jej dane pozostają na telefonie; host startuje od pustej strony i jest uruchamiany przez narzędzie testowe.

GPS jest syntetycznym wejściem do watchera aplikacji. Nie potwierdzono tu pomiarów fizycznego GPS, działania przy zablokowanym ekranie, natywnego śledzenia w tle, zabicia procesu przez mechanizmy oszczędzania energii, zakończenia sesji offline ani działania na iPhonie. Operacje kolejki w tym przebiegu to notatki. Utrata odpowiedzi jest wstrzykiwana na granicy `fetch` po prawdziwym zatwierdzeniu na serwerze, nie przez odłączanie całego telefonu od sieci.

## Weryfikacja i powtórzenie

Lokalnie: 881 testów / 149 plików, TypeScript, lint zmienionych plików (0 błędów) oraz izolowany build produkcyjny. Testy fizyczne przeszły po poprawce na tym buildzie. CI należy sprawdzać dla commita zawierającego ten raport.

1. PowerShell 7, lokalny Android SDK/JDK, Docker i Playwright z wcześniejszych prób. Jeden autoryzowany fizyczny telefon USB.
2. `./scripts/pilot-android-host.ps1 -PhysicalUsb` buduje osobny APK w `.pilot-drill/android-usb-host-20261107/`. Pierwsza instalacja wymaga zgody telefonu. Aktualizować można wyłącznie ten pakiet, zachowując dane; nie używać skryptów emulatora z czyszczeniem aplikacji.
3. `node scripts/pilot-browser-server.mjs --production --network-gateway` uruchamia bazę i produkcyjny build. Serwer kontrolny słucha tylko na loopback komputera. Przez USB przekierowany jest wyłącznie port aplikacji 4317.
4. `node scripts/pilot-usb-parts-check.mjs`, następnie `node scripts/pilot-offline-queues-check.mjs usb --full-offline`. Przed nowym przebiegiem wszystkie poprzednie oczekujące testowe operacje muszą być rozliczone — nie kasować ich. Test części potrzebuje co najmniej 4 sztuk.
5. Host startuje od `about:blank`, aby symulację awarii można było ustawić przed uruchomieniem kodu aplikacji. Restarty zamykają tylko proces testowego pakietu. Konto jest wylogowywane zwykłym API, bez czyszczenia IndexedDB. Playwright nie instaluje dodatkowego sterownika na telefonie.
6. Wyniki są w `.pilot-drill/usb-parts-result.json` i `.pilot-drill/queues-usb-result.json`. Adapter usuwa własne przekierowanie USB po teście. Plik `.pilot-drill/browser-stop` zatrzymuje własny serwer i usuwa wyłącznie jego jednorazowy kontener oraz wolumen; dane telefonu pozostają.
