# Audyt gotowości do pilotażu — 6 listopada 2026

Zakres: DUR, magazyn części, zlecenia, GPS; 40 pracowników, Android i iPhone. Kod: main `4525691`, wersja 1.9.4. Lokalny checkout zaktualizowany fast-forward z GitHub. Audyt kodu i automatycznych kontroli, nie certyfikacja bezpieczeństwa ani test terenowy.

## Decyzja

**NO-GO dla używania przez 40 osób jako wiążącej ewidencji magazynu i pracy.** Można przygotować demonstrację na fikcyjnych danych. Pilotaż operacyjny dopiero po usunięciu poniższych blokerów, początkowo 5–8 osób i równoległa dotychczasowa ewidencja. Nie ma uzasadnienia do przepisywania całej aplikacji; problemy skupiają się w integralności zapisów, uprawnieniach i synchronizacji.

P1 oznacza blokadę pilotażu w danym obszarze. Ustalenia poniżej wynikają ze ścieżek kodu; scenariusze współbieżności są analizą możliwego przeplotu operacji, nie wykonanym testem obciążeniowym.

## Blokery i dowody

### A01 — P1: dokument i stan magazynu nie zawsze stanowią jedną transakcję

`src/app/api/dur/stock/issues/route.ts`, `receipts/route.ts` wywołują `StockMovementService.addIssue/addReceipt` bez transakcji. `src/services/warehouse/warehouseMovements.ts` zapisuje dokument, a następnie osobno zmienia stan. Awaria drugiego zapisu pozostawia dokument bez zmiany stanu; ponowienie może utworzyć drugi dokument. Ścieżka pobierania części na zlecenie ma transakcję, ale ręczne PZ/WZ nie.

Naprawa: transakcja w publicznych metodach serwisów; wspólny wariant przyjmujący istniejącą transakcję; identyfikator operacji zapobiegający powtórnemu zapisowi. Test: wymuszona awaria po INSERT dokumentu nie pozostawia żadnej zmiany.

### A02 — P1: współbieżne wydania mogą zejść poniżej zera

`warehouseMovements.ts:42` odczytuje ilość i sprawdza dostępność przed `applyDelta`; `warehouseStock.ts` wykonuje bezwarunkowe dodanie delty. Dwa wydania po 4 sztuki przy stanie 5 mogą oba przejść walidację i dać −3. Transakcja bez blokady lub warunkowego UPDATE nie usuwa tego wyścigu. W migracjach repo nie znaleziono CHECK stanu nieujemnego; weryfikator schematu sprawdza kolumny, nie te gwarancje.

Naprawa: atomowe pomniejszenie z warunkiem wystarczającego stanu i kontrolą wyniku, zabezpieczenie DB oraz test dwóch równoczesnych wydań. Analogicznie serializować korekty i zwrot tej samej pozycji (`WorkOrderSparePartService` czyta pozycję przed transakcją).

### A03 — P1: korekta ilości zmienia historyczne WZ i dodaje drugi ruch

`src/services/dur/WorkOrderSparePartService.ts:185–225`: korekta z 2 do 3 sztuk tworzy WZ na +1, a następnie zmienia pierwotne WZ z 2 na 3. Stan maleje o 3, ale suma WZ wynosi 4. Przy korekcie w dół analogicznie zmieniana jest historia i dopisywane PZ. Istniejący test integracyjny sprawdza stan i oczekuje zmiany pierwotnego dokumentu, więc utrwala tę niespójność; nie uzgadnia sumy ruchów ze stanem.

Naprawa: niezmienne dokumenty i jawne korekty delta. Test pełnego uzgodnienia: stan początkowy + przyjęcia − wydania = stan końcowy, także po korektach i zwrotach. Korekta ręczna stanu również powinna mieć dokument, autora i powód.

### A04 — P1: uprawnienia DUR i izolacja odwołań do obiektów

Worker API `src/app/api/worker/work-orders/[id]/spare-parts/route.ts` sprawdza wyłącznie firmę zlecenia i flagę DUR. Nie sprawdza przypisania pracownika, uprawnienia DUR, rodzaju ani statusu zlecenia. Zwykły pracownik może wywołaniem API pobrać część na cudze lub zakończone zlecenie tej samej firmy; usuwanie pozycji korzysta z podobnej kontroli.

Ręczne PZ/WZ w `/api/dur/stock/*` nie weryfikują przynależności przekazanego partId, workOrderId i issuedTo do firmy. Klucze obce w `schema.ts` są pojedyncze, nie wiążą companyId obu rekordów. PZ dla znanego ID części innej firmy może stworzyć obce powiązanie; odczyty łączą tabele po ID i mogą ujawnić nazwy powiązanych obiektów. Nie wykonywano takiego żądania na rzeczywistych firmach.

Naprawa: jawna macierz uprawnień magazynier/lider/technik i kontrola wszystkich odwołań w serwisie. Testy negatywne osobno dla innej firmy, innego pracownika, zamkniętego zlecenia i wyłączonego DUR.

### A05 — P1: ponowne przyjęcie zlecenia i podwójne sesje

`WorkerOrderService.acceptOrder` nie wymaga `PENDING`, a UPDATE filtruje tylko ID. Po zamknięciu sesji ponowne przyjęcie tego samego zlecenia może utworzyć kolejną sesję. Kontrola aktywnej sesji w tym serwisie i `WorkerSessionService.createWizardSession` odbywa się przed transakcją; w repo brak unikalnego indeksu jednej aktywnej sesji pracownika. Dwa równoczesne żądania mogą przejść kontrolę.

Naprawa: atomowe przejścia stanów, deduplikacja żądania i gwarancja jednej aktywnej sesji w bazie. Test dwóch urządzeń, podwójnego kliknięcia i ponowienia po utraconej odpowiedzi.

### A06 — P1: kolejka offline może zmienić inną sesję i fałszywie potwierdzić zapis

`src/lib/offlineActionQueue.ts` nie zapisuje właściciela konta/firmy ani docelowego sessionId. `end_session`, notatki i zdjęcia dotyczą sesji aktywnej w momencie odbioru, nie tej z chwili kliknięcia. `LogoutButton.tsx` nie czyści ani nie izoluje kolejki. Po zmianie konta lub sesji opóźniona operacja może zmienić niewłaściwe dane.

`enqueueOffline` po błędzie IndexedDB nadal zwraca `{ ok: true, queued: true }`. `flushAll` nie ma blokady równoległego wykonania; `useOnlineStatus.ts` uruchamia wysyłkę z dwóch efektów, dodatkowo może ją uruchomić Service Worker. ID lokalnej operacji nie jest wysyłane do serwera. Po kolejnych błędach HTTP operacja jest usuwana zamiast trafiać do odzyskiwalnej listy konfliktów.

`WorkerSessionService.endActiveSession` ustawia `endTime: new Date()` przy odbiorze. Zakończenie o 14:00 zsynchronizowane o 16:00 daje dwie dodatkowe godziny. Sam createdAt kolejki nie trafia do API.

Naprawa: operacja = UUID + konto/firma + sessionId + czas zdarzenia + wersja; serwerowa idempotencja; jedna wysyłka; jawny stan lokalny/potwierdzony/konflikt; brak sukcesu przy błędzie trwałego zapisu. Test restartu telefonu, zmiany konta i utraconej odpowiedzi.

### A07 — P1: dane PWA w cache nie są rozdzielone między kontami

`public/sw.js` zapisuje sesję i zlecenia pod URL w jednym `werkit-v5`, a przy braku sieci oddaje zapisany wynik. Nie ma rozdziału według użytkownika ani czyszczenia przy wylogowaniu. To ryzyko pokazania danych poprzedniego konta na współdzielonym telefonie. Dotyczy PWA; rejestracja SW jest wyłączona w natywnym Capacitorze.

Naprawa: izolacja i cykl życia cache danych uwierzytelnionych, obsługa 401/403 oraz test A → wylogowanie → B → offline. Sam nagłówek HTTP no-store nie naprawia ręcznego `cache.put`.

### A08 — P1 dla GPS: punkty nie mają trwałego powiązania z sesją

`src/lib/gpsManager.ts` przechowuje współrzędne i timestamp, a `GpsService.saveGpsLogs` przypisuje je do aktualnie aktywnej sesji. Brak sessionId w punkcie, kontroli czasu względem sesji i deduplikacji. Zakończenie sesji w `workerSessionActions.ts` czyści bufor GPS również po zakolejkowaniu zakończenia offline, więc niewysłany ślad może zniknąć. Serwer sprawdza firmową flagę GPS, ale nie politykę stacjonarnej kategorii sesji.

Naprawa: sesja/właściciel/ID punktu, przyjęcie opóźnionych punktów właściwej zakończonej sesji w określonym oknie, niekasowanie przed potwierdzeniem, polityka GPS egzekwowana na serwerze. Test braku zasięgu, końca sesji i ponownego uruchomienia.

### A09 — P1 dla obietnicy jednakowego GPS: brak wdrożonej aplikacji iOS

Repo ma Androida i PWA; nie ma zależności `@capacitor/ios` ani projektu iOS. Nie można uznać iPhone’a za równoważny Androidowi z natywnym GPS w tle. Dla podstawowych zleceń/DUR można oceniać PWA na iPhone, ale ciągły ślad przy zablokowanym ekranie wymaga osobnej ścieżki natywnej i testów.

`plans/ios-support-2026-05.md` zawiera mylące twierdzenia o uniwersalnym limicie około 10 minut GPS i konieczności lokalnego Maca. Apple opisuje obsługę lokalizacji w tle, a dokumentacja Capacitor dopuszcza buildy chmurowe. Nie traktować tego starego planu jako dowodu ograniczeń platformy.

Źródła sprawdzone 2026-11-06: [Apple Core Location](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background), [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [Capacitor iOS](https://capacitorjs.com/docs/ios).

### A10 — P1 przed rzeczywistymi danymi: brak dowodu gotowości operacyjnej

W przeszukanych docs/plans nie znaleziono procedury odtworzenia bazy i zdjęć ani wyniku próby odtworzenia. To brak dowodu, nie dowód braku backupu u dostawcy. Nie sprawdzono ustawień retencji dostawcy, alertów, odzyskania kont administratora, rzeczywistego deploymentu i zgodności APK z nim. APK wskazuje stały produkcyjny URL — potrzebny odrębny wariant testowy/środowisko, aby codzienne zmiany nie destabilizowały pilotażu.

Warunek: odtworzenie kopii do oddzielnego środowiska, ustalony dopuszczalny czas przestoju i utraty danych, wskazany opiekun pilotażu, kanał zgłoszeń, wersja zamrożona na okres testów, procedura powrotu do dotychczasowej ewidencji.

## Dodatkowe ustalenia

- `createWizardSession` sprawdza zasób/klienta/materiał, ale nie przynależność i reguły kategorii; nie przenosi pełnej walidacji zlecenia naprawy. Ujednolicić z kanonicznym tworzeniem zleceń.
- Wymóg zdjęcia przy zakończeniu oraz okno anulowania są kontrolowane w UI, a nie w odpowiadających metodach serwera. Jeśli mają być zasadami firmy, muszą działać również przy bezpośrednim API.
- `AdminOrderService.deleteOrder` zwraca materiał dla sesji bez rozróżnienia ukończenia i usuwa historię sesji. Usunięcie historycznego zlecenia nie powinno oznaczać fizycznego powrotu zużytego materiału. Dla części również trzeba określić anulowanie, zużycie i zwrot; nie zastępować ich kasowaniem rekordów.
- 40 użytkowników nie uzasadnia mikroserwisów. Nie wykonano testu wydajności; pula DB 10 połączeń na instancję nie jest dowodem obsługi 40 osób ani globalnym limitem. Potrzebny test startu zmiany, odświeżania zleceń, zdjęć i GPS na środowisku testowym.

## Założenia produktu do zmiany

1. Dla tej firmy rdzeniem jest DUR, nie transport z dodatkiem napraw. Ustalić przepływ: zgłoszenie → kwalifikacja → przydział → realizacja → części → odbiór. Zakaz zgłoszenia awarii poza dyspozycją jest zbyt mocnym założeniem, jeśli operator maszyny ma zgłaszać usterkę. Nie trzeba od razu wdrażać całego CMMS/PM.
2. Pozycja planowana, rezerwacja, fizyczne wydanie, zużycie i zwrot to różne zdarzenia. Obecne dodanie części od razu zmniejsza stan. Jeśli planowanie BOM ma poprzedzać wydanie, ten model trzeba rozdzielić. Jeśli to tylko rejestr faktycznych pobrań, tak nazwać interfejs i potwierdzanie.
3. Sprawdzić pracę kilku techników nad jedną naprawą. Model jednego przypisanego userId i zakończenia zlecenia razem z jego sesją nie reprezentuje automatycznie zespołu ani przekazania między zmianami.
4. GPS nie lokalizuje niezawodnie ludzi/maszyn w hali. Dla DUR zacząć od lokalizacji zakładu, obszaru i zasobu oraz identyfikatora/QR; ślad GPS tylko dla uzasadnionych sesji mobilnych. Nie używać go jako dowodu produktywności.
5. Zachować rozdział części i materiałów, dopóki rzeczywisty proces nie wymaga inaczej. Reguła jednego ładunku nie jest kluczowa dla pilotażu DUR; nie rozszerzać teraz transportu.

## Plan dopuszczenia i mierzalne kryteria

1. Naprawić A01–A08 i walidację serwerową. Dodać testy awarii, powtórzeń i współbieżności, nie tylko szczęśliwej ścieżki. Równanie ruchów magazynowych musi zgadzać się dla każdego testowanego SKU.
2. Uzgodnić zakres iPhone: DUR/zlecenia w PWA albo pełna aplikacja natywna dla GPS w tle. Nie obiecywać tej samej funkcjonalności bez testu.
3. Przygotować testową firmę i środowisko, wgrać reprezentatywny katalog zasobów/części oraz role technik/lider/magazynier. Przećwiczyć odtworzenie kopii.
4. Wykonać macierz urządzeń: przynajmniej dwa różne Androidy i dwa iPhone’y, zablokowany ekran, odmowa zgody GPS, tryb oszczędzania, utrata internetu przez 30 min, restart, zmiana konta, aktualizacja aplikacji.
5. Scenariusze odbioru: równoczesne pobranie ostatniej części; korekta i zwrot; błędne/cudze ID; dwa starty tej samej pracy; utracona odpowiedź po udanym zapisie; offline koniec pracy o znanej godzinie; ponowna synchronizacja bez duplikatu; brak przecieku danych A/B.
6. Najpierw 5–8 osób, magazynier i lider przez 5 dni roboczych. Codzienna kontrola wszystkich ruchów, czasu i konfliktów synchronizacji. Warunek rozszerzenia: zero utraconych/zdublowanych operacji, zero niewyjaśnionych różnic magazynu i błędów uprawnień.
7. Następnie 15–20, potem 40 osób. Przed 40 wykonać symulację jednoczesnego początku zmiany; ustalić cel np. 95% zwykłych operacji poniżej 2 s na uzgodnionej sieci, bez błędów serwera i bez pogorszenia integralności.

## Walidacja techniczna

- TypeScript: przechodzi po aktualizacji.
- ESLint: 0 błędów, 4 ostrzeżenia.
- Vitest po aktualizacji: 767 testów przechodzi, 6 nie przechodzi, 137 plików. Wszystkie 6 w `planNativeWorkerAlarms.test.ts`, `localStorage` undefined w beforeEach. Uruchomienie lokalne na Node 26.13.0; CI używa Node 22. To nie dowodzi awarii alarmów na telefonie, ale lokalna kontrola nie jest zielona.
- `db:verify-schema`: wymagane kolumny zgodne. Nie weryfikuje constraintów, indeksów, poprawności danych ani odtwarzania backupu.
- Build produkcyjny: przechodzi. Pierwsza próba w ograniczonym środowisku kończyła się EPERM przy nadpisaniu `.next`; ponowienie poza tym ograniczeniem zakończyło się poprawnie.
- Testy integracyjne: 137/137 przechodzi, 25 plików, około 148 s, na podłączonej bazie z wydzielonymi firmami testowymi i sprzątaniem przez istniejące fixtures. Nie obejmuje to nowych scenariuszy współbieżności opisanych w audycie.
- Skan aktualnych podatności npm nie został ukończony: pierwsza próba nie miała DNS, rozszerzona próba została odrzucona przez automatyczną kontrolę zgody z powodu wysłania metadanych zależności do npm. Brak wyniku nie oznacza braku podatności.
- Nie wykonano interaktywnego testu UI, testu na fizycznych telefonach, pełnego pentestu ani testu obciążenia. Nie zmieniano schematu i nie uruchamiano migracji.

## Pierwszy pakiet napraw — 6 listopada 2026

Wprowadzono transakcje dla ręcznych PZ/WZ części, blokadę wiersza SKU serializującą wydania/przyjęcia przez StockMovementService, kontrolę firmy części/zlecenia/odbiorcy i niezmienność historycznego WZ przy korekcie. Worker API części wymaga przypisanego technika DUR i naprawy, a mutacje statusu IN_PROGRESS. Przyjęcie zlecenia odrzuca status inny niż PENDING.

Walidacja pakietu: 20/20 wybranych testów jednostkowych, 23/23 integracyjnych (w tym równoczesne wydanie ponad stan i kontrola sumy WZ), TypeScript i lint zmienionych serwisów poprawne. Bez zmian schematu DB.

To częściowa realizacja: nadal wymagają naprawy współbieżne korekty/zwroty pozycji, bezwzględne korekty stanu, wyścigi przy starcie i końcu sesji, atomowa kontrola uprawnień razem z mutacją, offline oraz GPS. Nie uznawać A02/A04/A05 za całkowicie zamknięte. Istniejących błędnych dokumentów nie przeliczano automatycznie.

Zatwierdzony skan npm --omit=dev zakończony: 8 zgłoszeń (2 critical, 5 high, 1 moderate). Pełny wynik: npm-audit-2026-11-06.json. Wśród krytycznych Capacitor Android GHSA-rvm3-566m-v7fv. Zależności w tym pakiecie nie były aktualizowane; wymaga to osobnego sprawdzenia kompatybilności i nowego APK.

## Drugi pakiet napraw — 6 listopada 2026

Korekty i zwroty blokują pozycję zlecenia SELECT FOR UPDATE wewnątrz transakcji. Oba wejścia startu sesji blokują pracownika i zasób, następnie ponownie sprawdzają aktywne sesje; przyjęcie zlecenia dodatkowo ponownie sprawdza status pod blokadą wiersza. Brak migracji schematu.

Offline: nowe operacje przekazują sessionId, serwisy filtrują docelową aktywną sesję; zakończenie zachowuje occurredAt po sprawdzeniu granic czasu. Stare wpisy bez sessionId są zatrzymywane. Wysyłka w jednym kontekście JS jest współdzielona, zatrzymuje się na błędzie i zachowuje konflikt. Błąd IndexedDB nie jest sukcesem. Nadal otwarte: idempotencja serwerowa po utraconej odpowiedzi, koordynacja między kartami, jawny właściciel kolejki i UI rozwiązywania konfliktów. Nie uznawać całego A06 za zamknięte.

Testy: 35/35 wybranych jednostkowych; 24/24 integracyjnych współbieżności, następnie 7/7 integracyjnych sesji po dodaniu ochrony sessionId/czasu i 24/24 jednostkowych po tej zmianie. TypeScript poprawny, lint 0 błędów/7 ostrzeżeń. Build po aktualizacji zależności poprawny (przed ostatnią zmianą walidacji czasu, którą sprawdzono testami i typami).

Next.js oraz eslint-config-next zaktualizowane do 16.4.5, pozostałe poprawki zależności w lockfile. npm audit --omit=dev: 0 podatności; wynik npm-audit-after-2026-11-06.json. To nie jest pełny pentest. Nowego APK nie zbudowano lokalnie ani nie sprawdzono na telefonie; zmiana package.json uruchamia workflow Android po pushu.

## Zakończenie protokołu offline v2 i weryfikacja APK — 6 listopada 2026

Kod: ca6b6b7; korekta formatowania: 73eff84. Nowy endpoint /api/worker/offline zapisuje mutację i potwierdzenie w jednej transakcji. ID jest generowane i zapisane w IndexedDB przed pierwszą wysyłką; identyczne ponowienie zwraca potwierdzenie, zmiana treści/aktora przy tym samym ID jest konfliktem. Web Locks koordynuje karty; bez tego API serwer nadal deduplikuje. Stare wpisy v1 pozostają do eksportu/świadomego odrzucenia. Interfejs pokazuje konflikty także online, umożliwia ponowienie, pobranie kopii i odrzucenie z potwierdzeniem. Dla zdjęć klucz obiektu jest deterministyczny per operacja; nie testowano awarii rzeczywistego Blob Storage.

Migracja 0036 zastosowana na bazie z .env.local; db:napraw-wszystko i db:verify-schema zakończone poprawnie. Potwierdzeń offline_operations nie należy kasować bez polityki wygaszania ponowień.

Testy nowe: 5/5 jednostkowych/UI oraz 3/3 integracyjnych (równoczesne identyczne żądania, ponowienie po utracie odpowiedzi, brak potwierdzenia po błędzie, obcy użytkownik, ponowienie zakończenia po zamknięciu sesji). Lokalna pełna seria: 772 przechodzą, 6 wcześniejszych błędów localStorage w testach alarmów na Node 26. CI na Node 22 dla 73eff84: SUCCESS, wszystkie etapy, w tym testy i build: https://github.com/mbatorowicz/Werkit/actions/runs/42251617585 . Lokalny TypeScript/build poprawny, lint 0 błędów / 8 ostrzeżeń. Koordynację Web Locks sprawdzono testem wywołania wspólnej blokady; nie jest to test dwóch fizycznych telefonów.

Android workflow 42251369737 dla ca6b6b7: SUCCESS (release AAB, release APK, debug APK i publikacja): https://github.com/mbatorowicz/Werkit/actions/runs/42251369737 . Metadane opublikowanego APK: 1.9.4, release, signing=play-upload, commit ca6b6b7a1a50f931f696b65d7b4d8b7312410cfa. APK pobrano i sprawdzono SHA-256 względem digestu GitHub: 7e0d0ee3e94db00a14f071a1e39f8a4299bfb00bc92c25f894f4e3383e31205e; rozmiar 9299126 bajtów. ZIP zawiera AndroidManifest.xml, classes.dex i assets/capacitor.config.json. Nie wykonywano instalacji na telefonie ani osobnego sprawdzenia certyfikatu apksigner. APK dotyczy funkcjonalnego commitu; kolejny commit zmienia wyłącznie formatowanie.

Wynik ten zamyka zakres implementacji deduplikacji i interfejsu konfliktów, nie cały audyt gotowości firmy. Testy terenowe Android/iPhone, GPS, backup/restore i pozostałe otwarte punkty raportu nadal obowiązują.

## GPS: przypisanie, trwała kolejka i zatrzymanie — 6 listopada 2026

Każdy nowy punkt ma trwały pointId, sessionId i czas pomiaru. Serwer sprawdza właściciela/firmę, niestacjonarny charakter oraz przedział czasu sesji; przyjmuje opóźnione punkty również po zakończeniu sesji. Unikalny client_point_id zapobiega duplikatom przy ponowieniu po utraconej odpowiedzi. Migracja 0037, db:napraw-wszystko oraz db:verify-schema wykonane poprawnie na podłączonej bazie.

IndexedDB v2 usuwa wyłącznie potwierdzone identyfikatory, bez czyszczenia całej kolejki przy błędzie lub zakończeniu. Równoczesny dopływ punktów nie ginie podczas potwierdzania. Niepotwierdzony punkt nie blokuje późniejszych partii tej samej sesji. Stare punkty bez sessionId pozostają zachowane do eksportu; nie przypisuje się ich automatycznie. Interfejs pokazuje zaległe punkty i pozwala pobrać kopię. Stary klient GPS wymaga przeładowania po wdrożeniu nowego API.

Lokalne zakończenie/anulowanie utrwala znacznik zatrzymania przed wysyłką operacji. Watcher reaguje w bieżącej i innych kartach; nie startuje ponownie dla lokalnie zamkniętej sesji i usuwa również spóźnioną rejestrację natywną. Synchronizacja zaległych danych działa także bez aktywnej sesji.

Walidacja: końcowy zestaw GPS 16/16 (kolejka 5, rzeczywiste IndexedDB 2, hook 9), integracyjne GPS 3/3 (w tym zamknięta sesja sprzed trzech dni, współbieżne ponowienia, granice czasu i obcy użytkownik). Wcześniej sprawdzono również banner/offline queue i istniejące testy serwisu. TypeScript poprawny, lint 0 błędów/10 ostrzeżeń, build poprawny; ostatnią drobną korektę kontynuowania partii sprawdzono testami. Formatowanie pozostałych plików zgłasza lokalne CRLF; po normalizacji do LF treść przechodzi kontrolę.

Ograniczenia: brak testu na fizycznym Androidzie/iPhonie, działania przy zablokowanym ekranie i wymuszonego ubicia aplikacji. PWA iOS nie zapewnia ciągłego GPS w tle. Usunięcie danych przeglądarki przez użytkownika/system nadal usuwa lokalną kolejkę. Nie uznawać całego pilotażu za gotowy wyłącznie na podstawie tych testów.

## CI i APK po naprawach GPS — 6 listopada 2026

Dla e88c0f8 CI 42254324308 oraz Android 42254318258 zakończyły się SUCCESS. Sprawdzono etapy, metadane publikacji i SHA-256 pobranego APK; szczegóły oraz niewykonane jeszcze próby urządzeń: [TESTY-TERENOWE-GPS-2026-11-06.md](./TESTY-TERENOWE-GPS-2026-11-06.md). APK ładuje zdalny web, dlatego zgodność wdrożonego web z poprawkami wymaga osobnej kontroli przed próbą. Nie potwierdzono instalacji, certyfikatu apksigner ani gotowości terenowej.
