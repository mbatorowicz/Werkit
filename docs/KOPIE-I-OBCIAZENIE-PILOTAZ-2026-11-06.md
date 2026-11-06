# Kopie, odtworzenie i obciążenie pilotażu — 2026-11-06

## Stan produkcji potwierdzony w panelu

Projekt Neon `neon-werkit`, PostgreSQL 17, gałąź main, plan Free. Odczyt 6 listopada około 19:04 Europe/Warsaw:

- History retention: **6 hours**; najwcześniejszy punkt wskazywany w panelu około 13:03 tego dnia.
- Backup & Restore: **No snapshots, no schedule set**. Harmonogram oferowany przez przycisk „Upgrade for schedules”.
- Odtwarzanie produkcji nie było uruchamiane. Nie zmieniano planu, retencji ani połączeń aplikacji.
- Zdjęcia aplikacji są w prywatnym Vercel Blob, poza kopią PostgreSQL. Nie potwierdzono harmonogramu ich niezależnego backupu.

[Panel Backup & Restore](https://console.neon.tech/app/projects/odd-paper-85251779/branches/br-sweet-morning-almv0kyx/restore).

**Ograniczenie dla wiążącej ewidencji produkcyjnej:** sześciogodzinne okno nie chroni przed błędem wykrytym następnego dnia. Sama udana próba techniczna nie oznacza, że istnieje przechowywana i monitorowana kopia produkcyjna.

## Powtarzalna próba na danych odizolowanych

Wymagane: działający Docker, Node co najmniej 22.15, obraz `postgres:17`, dostęp tylko do odczytu schematu źródła oraz zależności npm.

```text
npm run test:pilot:recovery
npm run test:pilot:blob
```

Pierwszy skrypt czyta z adresu bazy w środowisku **wyłącznie schemat** (pg_dump --schema-only, read-only, TLS verify-full). Nie kopiuje danych firmowych. Tworzy kontener z losową nazwą i hasłem, udostępniony tylko na 127.0.0.1 i losowym porcie. Wszystkie adresy bazy procesów testowych są zastępowane adresem lokalnym. Workload dodatkowo wymaga flagi testowej, lokalnego hosta, konkretnej nazwy bazy i pustej tabeli firm. Sekret Blob jest wyłączony w procesach DB. Kontener i jego wolumen są usuwane w finally; nie są zatrzymywane inne kontenery użytkownika.

W lokalnej bazie uruchamia 42 testy integracyjne, następnie tworzy syntetyczną firmę i 40 pracowników. Testuje równoczesną edycję zleceń, uruchomienie sesji, wydania/zwroty jednej wspólnej części, dashboard, GPS z ponowieniami, notatki offline i zakończenia offline. Kopię pełnej bazy testowej w formacie custom odtwarza do **drugiej, nowej bazy**. Porównuje SHA-256 posortowanych wierszy wszystkich tabel, definicje ograniczeń, indeksy i stany sekwencji. Na odtworzeniu serwisy odczytują historię i ponawiają 40 zakończeń offline bez wykonania ich drugi raz.

Drugi skrypt tworzy tylko dwa syntetyczne obiekty PNG w losowym prefiksie `__werkit_recovery_drill/` istniejącego prywatnego store. Pobiera kopię na dysk, odtwarza pod nową nazwą i porównuje SHA-256 pobranych bajtów; usuwa tylko obiekty utworzone przez tę próbę. Nie odczytuje istniejących zdjęć firmowych. Próba małego PNG nie dowodzi odtworzenia całego magazynu zdjęć ani przepustowości uploadu 40 telefonów.

Archiwa, certyfikaty, dane replay i robocze logi trafiają do `.pilot-drill/`, wyłączonego z Git. Do repo trafiają wyłącznie zagregowane raporty syntetyczne. Skrypty nie są produkcyjnym harmonogramem backupu, nie archiwizują sekretów ani uprawnień/roli infrastruktury. Nie używać ich wyniku jako RPO/RTO całej firmy.

## Wykryte i naprawione błędy

1. Nasycenie puli: 40 edycji zleceń kończyło się 40 błędami po około 10 s. Transakcje zajmowały 10 połączeń i pożyczały następne do walidacji. Walidatory encji/kategorii otrzymują teraz tę samą transakcję. Uprawnienia delegowania są wyliczane przed zajęciem połączenia, a cel sprawdzany pod blokadą zlecenia. Podobną poprawkę zastosowano przy walidacji zwracanej części.
2. Wydawanie tej samej części: 39/40 operacji kończyło się błędem przy konflikcie blokady klucza obcego po INSERT pozycji BOM z późniejszym FOR UPDATE na SKU. FOR NO KEY UPDATE nadal szereguje ruchy magazynowe, lecz jest zgodne z KEY SHARE potrzebnym do sprawdzenia FK. Wszystkie ruchy nadal są transakcyjne; nie zwiększano puli, nie usunięto walidacji zapasu.
3. Sprzątanie fixture: ruchy magazynu materiałów muszą być usunięte przed kaskadowym usuwaniem użytkowników firmy testowej, analogicznie do ruchów części. Poprawiono tylko helper testowy.

## Wynik i granice

Raporty obok tego pliku: `PILOT-RECOVERY-RESULT-2026-11-06.json` oraz `PILOT-BLOB-RESULT-2026-11-06.json`. Potwierdzono odtworzenie 36 tabel, 124 ograniczeń, 105 indeksów i 30 sekwencji, a także odczyty aplikacji i zachowanie potwierdzeń offline po odtworzeniu. Kontrola ilości: 4000 GPS, 40 notatek, 80 potwierdzeń operacji, 40 zakończonych sesji, 40 syntetycznych zdjęć w DB, 40 WZ i 40 PZ części; zapas po wydaniu i zwrocie wraca ze 100 przez 60 do 100.

To test serwisów aplikacji + lokalnego PostgreSQL, z pulą 10 połączeń. Czasy obejmują oczekiwanie w puli. Nie obejmuje HTTP, JWT/proxy, zimnego startu Vercel, sieci komórkowej, geokodowania, rzeczywistych telefonów ani długiego testu stabilności. Lokalne czasy poniżej sekundy nie dowodzą takich czasów na planie produkcyjnym Neon/Vercel. W bazie testowej tabele migracji i część słowników są puste; test nie zastępuje odtworzenia kompletnej kopii firmowej w kontrolowanym środowisku.

## Docelowa procedura produkcyjna

Na życzenie właściciela rozwój infrastruktury produkcyjnej odkładamy do oceny pilotażu. Ograniczony test powinien zachować równoległą dotychczasową ewidencję; Werkit nie jest jeszcze jedynym źródłem danych firmy. Poniższe propozycje nie są warunkiem zakupu usług przed testem.

Proponowane wymagania produkcyjne, jeszcze nie uzgodnione z firmą: dopuszczalna utrata danych 1 godzina, przywrócenie pracy w 4 godziny, co najmniej 7 dni historii i 30 dziennych kopii poza kontem produkcji. Wybrać i wdrożyć retencję Neon/snapshoty lub niezależny harmonogram; nie zakładać, że darmowy plan spełnia te wymagania. Wyznaczyć właściciela i zastępcę oraz alarm po nieudanej kopii lub przekroczeniu dopuszczalnego wieku.

Komplet kopii: pełny pg_dump w formacie custom (w tym drizzle, offline_operations i part_pick_operations), bajty zdjęć wskazywanych przez bazę z manifestem ścieżek i sum SHA-256, wersja kodu/migracji oraz bezpiecznie przechowywana konfiguracja infrastruktury. Eksport bazy i powiązanych zdjęć wymaga skoordynowanego okna bez kasowania zdjęć; sam URL lub wygasający signed URL nie jest kopią. Przechowywać szyfrowane kopie poza workspace/OneDrive i poza kontem produkcji; klucz odzyskania przechowywać oddzielnie, bez commitu i bez logów.

Odtwarzanie awaryjne:

1. Ustalić czas awarii i wstrzymać zmiany; zabezpieczyć kolejki telefonów. Nie odtwarzać na działającą bazę.
2. Odtworzyć wskazany snapshot/PITR lub pełne archiwum do nowej bazy/gałęzi. Użyć pg_restore --exit-on-error --single-transaction; dopasować wersję klienta PostgreSQL do źródła.
3. Odtworzyć zdjęcia do oddzielnego store. Zachować mapę starych i nowych ścieżek, poprawić powiązania w odtworzonej DB; sprawdzić sumy bajtów i odczyt przez aplikację. Nie przełączać produkcyjnego tokenu przed sprawdzeniem tej mapy.
4. Zweryfikować liczby i relacje sesji, GPS, części, stanów i PZ/WZ, użytkowników oraz potwierdzenia offline. Uruchomić zgodną wersję aplikacji i test odczytu, nowego zapisu oraz ponowienia operacji.
5. Odtworzenie do punktu sprzed wykonania operacji usuwa również późniejsze potwierdzenia offline: nie uruchamiać automatycznie wszystkich telefonów. Uzgodnić z firmą operacje po punkcie odtworzenia i rzeczywiste ruchy magazynowe. Test replay z tej sesji dotyczy potwierdzeń obecnych w kopii.
6. Przełączyć aplikację dopiero po kontroli i zatwierdzeniu danych. Zapisać rzeczywisty czas przestoju i zakres utraty. Zachować poprzednią bazę do kontrolowanego rozliczenia incydentu.

Dalszy test wydajności: oddzielny deployment i baza z takim samym planem/regionem jak produkcja, 40 klientów przez HTTP (JWT, dashboard, GPS, offline replay, zdjęcia), co najmniej 30 minut, pomiar błędów i p95/p99 oraz liczby połączeń przy wielu instancjach. Kryteria uzgodnić przed testem; nie generować tego ruchu na firmie produkcyjnej.

Źródła procedury: [pg_dump PostgreSQL 17](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html). Ustawienia konkretnego projektu ustalono z zalogowanego panelu, nie z opisów planów.
