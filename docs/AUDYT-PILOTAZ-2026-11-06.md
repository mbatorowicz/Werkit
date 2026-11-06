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
