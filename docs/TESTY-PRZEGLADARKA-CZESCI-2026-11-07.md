# Rzeczywista przeglądarka: ponowienia części — 2026-11-07

**PASS dla sprawdzonego przepływu pracownika. Nie wykryto błędu aplikacji w tych scenariuszach; dodano powtarzalne narzędzia i dowody.** Kod aplikacji: afc05c8 (ostatnia zmiana runtime 84abece).

## Środowisko i izolacja

Chrome 157 na Windows, uruchomiony przez Playwright w trybie headless. To rzeczywisty silnik przeglądarki, HTTP, logowanie cookie, React i IndexedDB; bez atrap magazynu lub IndexedDB. Lokalny Next dev: 127.0.0.1:4317, osobny PostgreSQL 17 w nowym kontenerze Docker, losowy port związany tylko z 127.0.0.1. Z podłączonej bazy źródłowej pobrano wyłącznie schemat przez read-only pg_dump i TLS verify-full. Nie kopiowano wierszy firmowych. Seed odmawia działania poza bazą lokalną o wymaganej nazwie i bez flagi izolacji; wymaga też pustej tabeli firm. Wszystkie konta, sesje, części i ruchy były syntetyczne. Stan kontrolny odczytywano bezpośrednio z lokalnej bazy przez tylko-odczytowy serwer testowy na 4318. Brak płatnej infrastruktury.

## Wykonanie i wyniki

| Próba | Wykonanie | Potwierdzony wynik |
|---|---|---|
| Utrata odpowiedzi PO zapisie | Playwright route.fetch wysłał prawdziwy POST i otrzymał 200; dopiero potem route.abort zerwał odpowiedź do aplikacji | Stan 10→8; dokładnie jedno WZ, jedna pozycja BOM, jedno trwałe potwierdzenie; UI zgłosiło błąd sieci |
| Pełny restart przeglądarki | Zamknięto persistent context wraz z osobnym procesem Chrome, uruchomiono nowy proces z tym samym profilem dyskowym | Odtworzona ilość 2 i dokładna notatka; zachowany identyfikator pobrania |
| A→B→A | Wylogowanie i logowanie przez prawdziwy interfejs; B to odrębny pracownik z własną sesją/zleceniem | B nie odtworzył formularza A; po powrocie A formularz wrócił |
| Ponowienie po restarcie i zmianie konta | Ręczne zatwierdzenie odtworzonego formularza | Ten sam Idempotency-Key, sukces; nadal stan 8, jedno WZ/BOM/potwierdzenie |
| Żądanie NIE DOTARŁO do serwera | Drugi zamierzony ruch: route.abort bez route.fetch, następnie pełny restart procesu | Przed restartem brak zmiany stanu; po ponowieniu ten sam klucz, dokładnie jeden nowy WZ; stan 8→6, łącznie dwa WZ/BOM/potwierdzenia |

Najpierw wykonano scenariusz interaktywnie; następnie cały zapisany test powtórzono, a na końcu ponownie na nowej pustej bazie. Raport ostatniej próby: [PILOT-BROWSER-RESULT-2026-11-07.json](./PILOT-BROWSER-RESULT-2026-11-07.json). Dwie różne zamierzone operacje w końcowej próbie dały dwa wydania; żadne ponowienie nie dodało trzeciego. Po testach zatrzymano wyłącznie własny serwer i usunięto własny kontener wraz z wolumenem.

## Powtórzenie

1. Docker Desktop, Node i zależności repo, zainstalowany Chrome oraz narzędzie Playwright browser_run_code_unsafe. Porty 4317 i 4318 muszą być wolne.
2. Uruchomić `node scripts/pilot-browser-server.mjs`. Skrypt kopiuje tylko schemat, tworzy izolowane dane, uruchamia Next dev. Logi, profil i syntetyczne dane dostępu zostają w ignorowanym `.pilot-drill/`; nie publikować ich jako raportu.
3. Po komunikacie gotowości i odpowiedzi strony /login wykonać narzędziem Playwright `browser_run_code_unsafe` plik `scripts/pilot-browser-check.js` (filename jako ścieżka absolutna repo). Plik jest wyrażeniem funkcji oczekiwanym przez to narzędzie, nie samodzielnym programem node. Nie doklejać średnika po całej funkcji podczas ręcznego formatowania.
4. Test loguje się przez UI, dwukrotnie zamyka i uruchamia nowy proces Chrome z tym samym profilem; wyniki zwraca jako JSON. Działa wyłącznie na zapisanych w skrypcie lokalnych URL. Dla każdego niezależnego przebiegu zalecana nowa baza — skrypt zużywa łącznie 4 sztuki.
5. Utworzyć pusty `.pilot-drill/browser-stop`; runner zatrzyma własne drzewo procesu Next przez taskkill i usunie własny kontener/volume w finally. Limit awaryjny sesji: 30 minut. Nie kasować profili z innej aktywnej próby. Next dev może dopisać własny blok do AGENTS.md; to efekt uruchomienia narzędzia, nie poprawka produktu.

## Granice dowodu

To test lokalnego Next dev i Chrome headless, nie builda produkcyjnego przez Vercel, Safari/WebKit, Android release APK ani fizycznego iPhone'a. Restart oznacza zakończenie procesu Chrome i odtworzenie profilu, nie wymuszony zanik zasilania urządzenia. Nie badano zimnego startu offline, iOS eviction ani usunięcia danych aplikacji. Konto B nie wysyłało osobnego pobrania w tym przebiegu. Test nie obejmował panelu administratora ani przejścia do innej firmy. Kontrole tych zakresów w testach jednostkowych/integracyjnych nie zastępują prób urządzeń. Scenariusze urządzeń pozostają w [TESTY-TERENOWE-CZESCI-2026-11-06.md](./TESTY-TERENOWE-CZESCI-2026-11-06.md).
