# Pobrania części: Android WebView i WebKit

Data: 2026-11-07. Werkit 1.9.4. Bez płatnej infrastruktury.

## Środowisko i izolacja

- Lokalny PostgreSQL 17 w jednorazowym kontenerze, wyłącznie syntetyczna firma, konta A/B, sesje napraw i część testowa. Z bazy źródłowej odczytano wyłącznie schemat, bez danych firm.
- Lokalny Next.js na 127.0.0.1:4317; kontrola rzeczywistych WZ, BOM, potwierdzeń i stanu przez odczyt 127.0.0.1:4318/state.
- Playwright 1.65.0, WebKit 27.2 (build 2388) na Windows. To silnik WebKit, nie aplikacja Safari na iPhonie; patrz [dokumentacja Playwright](https://playwright.dev/docs/browsers).
- Osobny emulator AOSP Android 15/API 35, systemowy com.android.webview 124.0.6367.219. Mały host com.werkit.pilot uruchamia prawdziwy WebView z JavaScript i DOM storage. Nie jest to produkcyjne APK Capacitor; nie weryfikuje mostków natywnych, GPS ani zachowania fizycznego telefonu.
- Restart WebKit zamyka cały proces i otwiera ten sam profil na dysku. Android przechodzi do tła, a następnie proces hosta jest zatrzymywany przez am force-stop i uruchamiany ponownie. Nie usuwa się danych aplikacji. Nagłe odcięcie zasilania nie było testowane.

## Scenariusze

W obu silnikach wykonano te same kroki na rzeczywistym API:

1. A pobiera 2 części. Test przepuszcza żądanie, czeka na zatwierdzenie serwera, następnie zrywa odpowiedź. W bazie powstaje dokładnie jeden WZ, jedna pozycja BOM i jedno potwierdzenie.
2. Zamknięcie procesu i restart odtwarzają ilość i notatkę formularza.
3. Wylogowanie A, logowanie B: brak formularza A. Powrót do A odtwarza jego oczekujące pobranie.
4. Ponowienie zachowuje Idempotency-Key. Stan, liczba WZ, BOM i potwierdzeń nie zmieniają się.
5. Drugie, celowe pobranie zostaje przerwane przed wysłaniem do API. Baza pozostaje bez zmian. Restart i ponowienie zachowują klucz i wykonują operację dokładnie raz.

Wyniki maszynowe: `PILOT-WEBKIT-RESULT-2026-11-07.json` i `PILOT-WEBVIEW-RESULT-2026-11-07.json`. Liczniki obejmują wcześniejsze operacje w danym przebiegu; asercje sprawdzają przyrosty i brak zmiany przy ponowieniu.

## Wykryty i naprawiony błąd

WebKit dwukrotnie ujawnił brak panelu części po restarcie. Oczekujący wpis IndexedDB pozostał prawidłowy i przypisany do konta. Pierwszy render serwerowy `/worker` pomijał `orderType`, `resourceGroupId` i `repairDescription` aktywnej sesji. Panel napraw nie mógł się wyświetlić, dopóki inne odświeżenie nie uzupełniło sesji. Uzupełniono mapowanie i dodano test regresji pierwszego renderu. Po poprawce scenariusze przeszły w obu silnikach.

Drugi problem ujawnił się w kolejnym powtórzeniu: po restarcie profil WebKit otrzymywał 503 dla plików JavaScript i fontów, mimo działającego API. `cacheFirst` obejmował pobranie i zapis Cache Storage jednym `try`, więc błąd zapisu mógł zamienić poprawną odpowiedź sieci na „offline”. Odczyt i zapis cache są teraz opcjonalne; poprawna odpowiedź sieci nie przepada przy błędzie magazynu cache. Test regresji wymusza błąd zapisu i sprawdza odpowiedź 200 z treścią skryptu. Po tej zmianie ponowne pełne przebiegi obu silników przeszły. Nie przypisujemy każdego 503 konkretnej wewnętrznej przyczynie silnika WebKit bez jego śladu diagnostycznego.

Minimalna strona z rzeczywistym service workerem (bez bazy i logowania) potwierdziła `TypeError: Failed writing data to the file system`. Prywatne snapshoty również zamieniały poprawną odpowiedź serwera na 503 przy błędzie cache. Rozdzielono te przypadki. Cache poprzedniego właściciela nadal jest usuwany przed zapisem nowego; błąd zapisu nie autoryzuje niezapisanego snapshotu. Test regresji sprawdza A→B, błąd zapisu B i restart service workera offline: dane A nie wracają. Minimalna strona po poprawce przeszła trzy uruchomienia z odpowiedziami 200.

Końcowe testy wstrzykują błąd na granicy fetch aplikacji: odczytują rzeczywistą odpowiedź 200, po czym zgłaszają błąd przed przekazaniem jej aplikacji. Drugi scenariusz zgłasza błąd przed wysłaniem żądania. To symulacja, nie fizyczne odłączenie radia. Wcześniejsze page.route bywało pomijane dla żądań obsługiwanych przez service worker WebKit; wykryła to asercja stanu bazy. Końcowe testy potwierdzają przechwycenie żądania. [Ograniczenia routingu Playwright](https://playwright.dev/docs/service-workers).

### Pozostała niepewność — istniejący profil WebKit

Zachowany profil z wczesnego nieudanego przebiegu nadal miał problem z wejściem do aplikacji i późniejszym logowaniem po aktualizacji service workera. W IndexedDB pozostaje prawidłowy wpis oczekującego pobrania. Świeży profil przechodzi pełne scenariusze, lecz nie dowodzi to naprawy tego przypadku. Nie uznajemy restartu PWA w WebKit za bezwarunkowo zaliczony. Do dalszej diagnozy pozostaje przywrócenie logowania w tym profilu i powtórzenie na produkcyjnym buildzie oraz Safari na urządzeniu. Nie czyszczono danych problematycznego profilu, żeby nie zamaskować błędu. Błąd zapisu WebKit pod Windows nie dowodzi tego samego błędu na iOS.

## Powtórzenie

1. Wymagane lokalnie: Docker, Node, Android SDK i JDK. Zainstaluj narzędzia poza zależnościami aplikacji: `npm install --prefix .pilot-drill/browser-tools --no-audit --no-fund playwright@1.65.0`. Ustaw `PLAYWRIGHT_BROWSERS_PATH` na bezwzględną ścieżkę `.pilot-drill/browser-engines`, uruchom `node .pilot-drill/browser-tools/node_modules/playwright/cli.js install webkit`.
2. Uruchom `node scripts/pilot-browser-server.mjs`; poczekaj na komunikat gotowości. Serwer ma limit 30 minut i usuwa własny kontener po utworzeniu `.pilot-drill/browser-stop`.
3. `node scripts/pilot-webkit-check.mjs` zapisuje wynik w `.pilot-drill/webkit-result.json`.
4. Uruchom osobny emulator API 35 na porcie 5580 (serial emulator-5580), bez prywatnych danych. Test używa wyłącznie tego numeru i wymaga `ro.kernel.qemu=1`. Nie używaj osobistego telefonu.
5. `powershell -File scripts/pilot-android-host.ps1` buduje osobny APK testowy. Skrypt wskazuje lokalny SDK, build-tools 36.1.0, platform android-36.1 i JDK Android Studio; dostosuj ścieżki do swojej instalacji. Zainstaluj `.pilot-drill/android-host/werkit-pilot.apk` przez `adb -s emulator-5580 install -r`.
6. `node scripts/pilot-webview-check.mjs` kieruje port 4317 do lokalnej aplikacji, steruje WebView przez CDP i zapisuje `.pilot-drill/webview-result.json`. Wyniki i profile są ignorowane przez Git i ESLint. Po testach zatrzymaj własny emulator i serwer.

Testy silników wymagają lokalnych narzędzi, nie są częścią zwykłego CI. CI obejmuje test regresji, pozostałe testy jednostkowe/UI, lint, TypeScript, formatowanie i build Next.js. Test na fizycznym iPhonie oraz produkcyjnym APK pozostaje osobnym etapem pilotażu.
