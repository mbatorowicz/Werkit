# Testy pobrania części — Android i iPhone

Data: 2026-11-06. Status: **scenariusze przygotowane, niewykonane na fizycznych telefonach**. Tylko konta, części i zlecenia testowe, bez rzeczywistego rozliczania magazynu. Nie są wymagane płatne usługi.

## Weryfikacja web ↔ APK przed przygotowaniem prób

- Domena https://werkit.cncsolutions.dev wskazuje deployment `dpl_BKipUSipDp3mS2cUdrp3LC4zmLCd`, stan READY, target production, commit `84abece40058e88f5148a69f0982f00645c98bac`. Potwierdzono przez API Vercel.
- Publiczny GET /login: HTTP 200, wersja **1.9.4-84abece**. Obejmuje atomowe wydania, idempotencję serwerową i trwałe pobrania przypisane do konta.
- [CI kodu web](https://github.com/mbatorowicz/Werkit/actions/runs/42282770882): SUCCESS (testy i production build, potwierdzone w poprzednim pakiecie).
- [GitHub Release android-latest](https://github.com/mbatorowicz/Werkit/releases/tag/android-latest): metadane 1.9.4, release, signing=play-upload, commit `8caa569282d573a02b57997873ff2b1ae4de7ea8`, builtAt `2026-11-06T18:12:15.326Z` (19:12 czasu polskiego).
- Pobrany APK: 9 301 095 bajtów; SHA-256 `7201c0c71547a15b24ac0bd76a934a896caf34d23b325c3c7883f8f9045521d0`, zgodny z digestem assetu GitHub.
- Sprawdzony wewnątrz pobranego APK `assets/capacitor.config.json`: appId `com.werkit.app`, server.url `https://werkit.cncsolutions.dev/`.
- Brak zmian między commitem APK i web w android/, capacitor.config.ts, package.json/package-lock.json, natywnym module GPS i biometricLogin.ts. Ostatnie poprawki są w zdalnym web; **zgodność kodu i konfiguracji potwierdzona, nie jest potrzebny nowy APK tylko dla tych poprawek**. Nie oznacza to wykonanego testu WebView na telefonie.
- Wspólny numer 1.9.4 ani badge inSync (porównuje semver) same nie dowodzą zgodności. Przed próbą odnotować hash web, metadane APK i przeładować aplikację ONLINE. Otwarta od dawna karta może nadal mieć wcześniejszy kod.
- Publiczny odczyt /api/app/android/info zwrócił 401 bez logowania. Zweryfikowano APK z GitHub, nie plik pobrany przez zalogowany panel (możliwy override źródła). Administrator przed instalacją porównuje plik z panelu z powyższym SHA-256. Nie sprawdzano certyfikatu apksigner ani instalacji na urządzeniu.

## Stanowisko i przygotowanie

Minimum: dwa Androidy różnych producentów z release APK; iPhone w Safari i osobno PWA z ekranu głównego. Każdy tryb ma oddzielny protokół i pamięć — nie zakładać wspólnej kolejki Safari/PWA/APK. Zapisać model, system, wersję Android System WebView/Chrome, tryb, wersję web i APK, datę/godzinę. iPhone nie używa APK.

1. Konto A i konto B to różni aktywni pracownicy tej samej firmy testowej z DUR. Oddzielne przypisane naprawy ZA i ZB, aktywne sesje SA/SB. Dodatkowo konto C innej firmy testowej do kontroli izolacji. Nie zmieniać przypisania ZA podczas podstawowych prób.
2. Operator admina obserwuje magazyn na drugim urządzeniu. Dla każdej próby użyć osobnej testowej części P ze stanem **10 szt.**, ilością pobrania **2 szt.** i notatką `TEST-CZESCI-<id próby>`. Nie korygować zapasu ani nie zwracać części w trakcie próby.
3. Zalogować A online, odczekać na pełny dashboard/listę części, potwierdzić ZA/SA. Zarejestrować: stan 10, brak pozycji BOM i WZ tej próby. Nie używać trybu prywatnego.
4. Operator zapisuje liczbę WZ, pozycje zlecenia i stan po każdym kroku. Jeśli to możliwe, osoba techniczna odczytuje tylko testowe `part_pick_operations` (operationId, właściciel, wynik) oraz WZ. Nie umieszczać tokenów, haseł ani całych logów żądań w protokole.
5. Nie czyścić danych, nie odinstalowywać, nie przenosić originu i nie zamykać sesji SA, dopóki oczekujące pobranie nie jest rozstrzygnięte. Zwykłe wylogowanie jest osobną próbą; zachowuje zapis A.

## Jak uzyskać rzeczywistą utratę odpowiedzi

**Wyłączenie sieci przed kliknięciem nie dowodzi utraty odpowiedzi po zapisie.** Wymagany stan dowodowy: serwer ma jedno WZ/BOM i stan 8, a telefon nie otrzymał potwierdzenia i zachował nierozstrzygnięte pobranie.

Na release APK oraz iPhonie można wykonać próbę ręczną: Wi-Fi bez danych komórkowych, pobranie i natychmiastowe odłączenie Wi-Fi lub tryb samolotowy. Operator admina sprawdza wynik. Jeśli serwer ma stan 10 — sprawdzono brak wysyłki, nie utratę odpowiedzi. Jeśli telefon pokazał sukces — odpowiedź dotarła, próba nie kwalifikuje się. Dla nowej próby użyć nowej części/zlecenia, bez ignorowania nierozstrzygniętej poprzedniej.

Gdy timing nie daje wymaganego stanu, oznaczyć **NIE WYKONANO**, nie PASS. Osoba techniczna może w kontrolowanym środowisku testowym jednokrotnie zatrzymać odpowiedź konkretnego POST po przekazaniu żądania do serwera i potwierdzeniu WZ. Narzędzie musi blokować odpowiedź, a nie samo żądanie. Nie zakładać dostępu do debugowania release WebView; nie instalować certyfikatów ani nie zmieniać zabezpieczeń telefonów firmowych na potrzeby tej instrukcji. Symulacja w przeglądarce/debug buildzie jest wynikiem pomocniczym, nie zastępuje próby release APK.

## Scenariusze — każdy wykonać w każdym trybie

### CZ-01 — utrata odpowiedzi i ponowienie

1. Uzyskać opisany powyżej stan: serwer 8 szt., jedno WZ i jedna pozycja ZA; telefon bez potwierdzenia.
2. Przywrócić internet. Nie zmieniać części, ilości ani notatki. Ponowić pobranie raz, potem sprawdzić wynik w adminie.
3. Zaliczenie: telefon otrzymuje sukces, stan nadal **8**, dokładnie **jedno WZ**, jedna pozycja o ilości 2 i jedno potwierdzenie operacji dla A. OperationId ponowienia identyczny, jeśli dostępny do odczytu. Brak nowej mutacji przy replay.
4. Kontrola rozróżnienia: dopiero po sukcesie zainicjować świadomie NOWE pobranie 2 szt. Powinno utworzyć drugi dokument i zmienić stan na **6** z nowym kluczem.

### CZ-02 — zamknięcie po niepotwierdzonym pobraniu

1. Nowa część ze stanem 10. Uzyskać stan dowodowy utraty odpowiedzi (stan 8).
2. Pozostając offline, zamknąć aplikację. Android: osobno usunięcie z ostatnich aplikacji i Wymuś zatrzymanie. iPhone: osobno usunięcie Safari/PWA z przełącznika; dla Safari wykonać dodatkowo zamknięcie karty i otwarcie nowej pod tym samym adresem.
3. Otworzyć aplikację najpierw offline. Zanotować dostępność powłoki/formularza. Niedostępność ekranu przy zimnym starcie APK nie jest automatycznie dowodem utraty zapisu — wynik startu offline zapisać osobno.
4. Przywrócić sieć i otworzyć ZA jako A. Formularz powinien odtworzyć część, 2 szt. i dokładną notatkę. Samo otwarcie nie tworzy WZ.
5. Ręcznie zatwierdzić odtworzone pobranie. Zaliczenie: dokładnie jedno WZ/BOM, stan **8**, to samo operationId. Brak potrzeby odtwarzania pól z pamięci.

### CZ-03 — restart telefonu i ponowienie

Powtórzyć CZ-02, ale po nierozstrzygniętym pobraniu uruchomić ponownie cały telefon (nie tylko aplikację). Osobno wykonać wariant, w którym żądanie w ogóle nie dotarło do serwera: przed ponowieniem stan **10**, po ponowieniu **8** i jedno WZ. W obu wariantach zapisane pola i klucz mają przetrwać. Do czasu powrotu internetu nie oczekiwać automatycznego wydania w tle.

### CZ-04 — konto A → B → A

1. A ma nierozstrzygnięte pobranie na ZA (wariant po zapisie: stan 8).
2. Przywrócić sieć, wylogować A i zalogować B. Nie czyścić pamięci aplikacji.
3. B nie widzi formularza/notatki A ani nie może ponowić jego pobrania. Na ZB może wykonać własną próbę na innej części; jej operationId i właściciel są inne. ZA pozostaje niezmienione.
4. Zamknąć aplikację, otworzyć, wylogować B i zalogować A. Otworzyć ZA, sprawdzić odtworzenie dokładnych pól, ponowić.
5. Zaliczenie: zapis A nie został usunięty ani przejęty przez B; po ponowieniu ZA ma jedno WZ i stan **8**. Wynik B jest niezależny. Powtórzyć z kontem C innej firmy, bez ujawnienia danych A/C.

### CZ-05 — stare okno po zmianie konta (przeglądarka)

W dwóch kartach tej samej przeglądarki otworzyć A, w drugiej wylogować i zalogować B. Ze starej karty A próbować wysłać oczekujące pobranie. Zaliczenie: konflikt/odmowa konta, **zero wydań jako B**, zapis A zachowany. Po ponownym zalogowaniu A można go rozstrzygnąć. Nie przenosić wyniku tego testu na dwa niezależne magazyny pamięci Safari/PWA.

### CZ-06 — edycja danych nierozstrzygniętej próby

Po utracie odpowiedzi zmienić ilość z 2 na 3 i spróbować wysłać. Zaliczenie: komunikat o nierozstrzygniętym pobraniu, brak nowego WZ, stan 8. Zamknąć/otworzyć aplikację: formularz wraca do zapisanej ilości **2** i notatki. Ponowić oryginalne dane; stan nadal 8.

### CZ-07 — rozróżnienie starego wpisu v1 i usunięcia pamięci

Jeśli na telefonie faktycznie pozostał wpis sprzed aktualizacji bez właściciela, nowa wersja ma zablokować wysłanie i poprosić o sprawdzenie wydania. Nie dopisywać mu właściciela ręcznie. Brak takiego wpisu oznaczyć NIE DOTYCZY. Wyczyszczenie danych lub odinstalowanie może usunąć zapis lokalny — nie jest to zwykły restart, nie wykonywać na nierozstrzygniętych próbach. Serwer nadal zna potwierdzone operacje, ale nowy klient bez pierwotnego klucza nie może zgadywać tożsamości pobrania.

## Protokół i decyzja

| Pole | Wynik |
|---|---|
| Tester / data / godziny / ID scenariusza | |
| Model / system / WebView / APK lub Safari/PWA | |
| Wersja web / commit APK / SHA-256 | |
| Firma testowa / konta / zlecenie / sesja / część | |
| Stan przed / po pierwszej próbie / po ponowieniu | |
| Liczba WZ i pozycji / ich identyfikatory | |
| Czy udowodniono zapis przed utratą odpowiedzi? | TAK / NIE |
| Czy pola i operationId przetrwały restart? | |
| Czy B/C ujawniło lub wysłało dane A? | |
| Wynik startu offline oddzielnie od trwałości | |
| Wynik / dowód / opis odchylenia | PASS / FAIL / NIE WYKONANO / NIE DOTYCZY |

Każdy tryb musi osobno zaliczyć CZ-01–04 i CZ-06. CZ-05 dotyczy trybów z kartami. Co najmniej 3 powtórzenia CZ-01 i CZ-02 na każdym urządzeniu; brak udokumentowanego przypadku utraty odpowiedzi nie jest zaliczeniem. Duplikat WZ, zmiana stanu bez dokumentu, utrata próby po zwykłym restarcie lub wykonanie jej na obcym koncie oznaczają STOP dla tego przepływu. Zachować dowody, nie maskować problemu ręczną korektą. Sprzątanie syntetycznych danych dopiero po zapisaniu wyników.

Po zaliczeniu: ograniczony test 5–8 osób z równoległą dotychczasową ewidencją, dopiero potem rozszerzenie. Te scenariusze nie zastępują [testów GPS](./TESTY-TERENOWE-GPS-2026-11-06.md) i nie potwierdzają ciągłego GPS w tle iPhone'a.
