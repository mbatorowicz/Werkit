# Testy terenowe GPS — Android i iPhone

Data przygotowania: 2026-11-06. Status: scenariusze przygotowane, testów na telefonach jeszcze nie wykonano.
Zakres: pilotaż DUR dla 40 pracowników; GPS wyłącznie podczas niestacjonarnej sesji pracy.

## Zweryfikowany build

- Kod GPS: e88c0f8cdc5c2dd2ac8e143937da793aa6551280.
- [CI](https://github.com/mbatorowicz/Werkit/actions/runs/42254324308): SUCCESS; Prettier, ESLint, TypeScript, Vitest i production build zakończone poprawnie.
- [Android](https://github.com/mbatorowicz/Werkit/actions/runs/42254318258): SUCCESS; release AAB, release APK, debug APK oraz publikacja zakończone poprawnie.
- APK 1.9.4, release; metadane deklarują signing=play-upload, builtAt=2026-11-06T16:42:27.797Z i powyższy commit.
- Pobrany APK: 9 299 126 bajtów. SHA-256: aa49d54b209b7e831b445fcff3024c805f82c539f84b9e697376d4edb0938bc6 — zgodny z digestem GitHub.
- Archiwum APK zawiera AndroidManifest.xml, classes.dex i assets/capacitor.config.json. Nie sprawdzano certyfikatu narzędziem apksigner ani instalacji na urządzeniu.
- [Pobieranie APK](https://github.com/mbatorowicz/Werkit/releases/download/android-latest/werkit.apk). Ten adres jest zmienny: przed instalacją porównaj metadane i hash. Sama wersja 1.9.4 nie odróżnia tego buildu od wcześniejszego.

APK ładuje web z https://werkit.cncsolutions.dev/. Sukces builda APK nie potwierdza wdrożenia tego samego kodu web. Przed próbą administrator sprawdza wersję web/deployment względem e88c0f8 (lub późniejszego zawierającego poprawki), a tester przeładowuje aplikację ONLINE. Nie czyścić danych aplikacji ani nie odinstalowywać jej z zaległą kolejką. Instalacja wymagająca odinstalowania starej wersji jest osobnym przypadkiem — najpierw synchronizacja i eksport.

## Przygotowanie

1. Wydzielić konta i zasoby testowe, bez rzeczywistych dokumentów magazynowych. Operator panelu admina obserwuje sesje równolegle.
2. Minimum dwa Androidy różnych producentów oraz iPhone. Na Androidzie testować release APK; na iPhonie osobno Safari i PWA dodaną do ekranu głównego. Nie przenosić wyniku Safari na PWA. Nie zakładać natywnej aplikacji iOS.
3. Zanotować model, wersję systemu, tryb aplikacji, ustawienia lokalizacji/dokładności, baterii i sieci. Pierwszą serię wykonać bez oszczędzania energii, potem powtórzyć z ustawieniami faktycznie stosowanymi w firmie.
4. Używać automatycznego czasu telefonu. Wybrać bezpieczną trasę pieszą na zewnątrz, 300–500 m, z trzema punktami kontrolnymi A/B/C. Nie obsługiwać telefonu podczas prowadzenia pojazdu.
5. Zalogować się online, potwierdzić pustą kolejkę i uruchomić niestacjonarną sesję S1. Zapisać ID i czas startu. Przejść 100 m i sprawdzić ślad w panelu.
6. Przy każdej próbie zapisywać godziny zdarzeń, liczbę zaległych punktów, ID sesji i wynik. Jeśli są zaległości, pobrać kopię przed dalszymi zmianami. Eksport zawiera lokalizacje — przechowywać w kontrolowanym miejscu firmy.

Punkty mają filtr dokładności 40 m, a natywny watcher filtr dystansu 10 m. Nie oczekujemy punktu co sekundę ani przy bezruchu. Mierzymy zachowanie utrwalonych punktów i przypisanie sesji, a kompletność fizycznego śladu oceniamy osobno. Dla prób przywrócenia sieci przyjmujemy próg testowy 120 s z aplikacją na pierwszym planie; przekroczenie wymaga wyjaśnienia, nie jest automatycznie dowodem utraty danych.

## Scenariusze

### GPS-01 — utrata i powrót sieci, ekran włączony

1. W S1 wyłączyć Wi-Fi i dane komórkowe, pozostawiając lokalizację aktywną. Potwierdzić brak internetu.
2. Przejść A→B przez 5 minut z otwartą aplikacją. Zanotować wzrost zaległych punktów, pobrać eksport E1.
3. Przywrócić sieć, pozostawić aplikację otwartą przez 120 s. Przejść B→C.
4. Operator sprawdza ślad S1; osoba techniczna porównuje pointId z E1 z client_point_id w bazie (odczyt ograniczony do testowej sesji).

Zaliczenie: każdy poprawny punkt z E1 zapisany dokładnie raz i tylko w S1; kolejka opróżnia się po potwierdzeniu. Brak arbitralnego usuwania na błędzie. Punkty odrzucone pozostają widoczne/eksportowalne, a przyczyna jest udokumentowana. Powtórzyć z trzykrotnym krótkim przełączeniem sieci.

### GPS-02 — ekran zablokowany

1. W nowej sesji przejść 100 m online. Zablokować ekran, przejść trasę przez 10 minut, odblokować i sprawdzić ślad.
2. Powtórzyć: odłączyć sieć przed blokadą; po 10 minutach odblokować, pobrać eksport i przywrócić sieć.
3. Powtórzyć z firmowymi ustawieniami oszczędzania baterii; zapisać czas/długość luk.

Android APK: wymagamy śladu podczas ruchu przy konfiguracji dopuszczonej do pilotażu i późniejszego przesłania wszystkich utrwalonych punktów. Brak śladu w tle oznacza niezaliczony wymóg GPS w tle dla tego urządzenia/konfiguracji.

iPhone Safari/PWA: nie zakładamy gwarancji ciągłego pomiaru w tle. Mierzymy rzeczywiste przerwy. Brak nowych punktów podczas uśpienia należy odróżnić od utraty już zapisanych. Po powrocie istniejąca kolejka musi się zachować i zsynchronizować. Jeśli firma wymaga ciągłego śladu przy zablokowanym ekranie, stwierdzona luka blokuje ten sposób używania iPhone'a; nie oznaczać całego testu jako zaliczonego tylko dlatego, że synchronizacja ruszyła.

### GPS-03 — zamknięcie aplikacji i restart offline

1. W aktywnej sesji wyłączyć sieć, przejść 200 m, pobrać eksport E2 i zapisać liczbę punktów.
2. Android: osobne próby (a) przejścia na ekran główny, (b) usunięcia z ostatnich aplikacji, (c) Ustawienia → aplikacja → Wymuś zatrzymanie. iPhone: osobno przejście na ekran główny i usunięcie Safari/PWA z przełącznika aplikacji.
3. Odczekać 2 minuty, otworzyć aplikację nadal offline. Zanotować, czy ekran pracownika w ogóle się otwiera i czy kolejka jest dostępna.
4. Przywrócić sieć, otworzyć aplikację, sprawdzić kolejkę i sesję. Porównać E2 z zapisami serwera.

Zaliczenie trwałości: wszystkie punkty zapisane przed zamknięciem zachowane, po synchronizacji występują raz w pierwotnej sesji. Nie wymagamy zbierania po wymuszonym zatrzymaniu procesu; przerwę odnotować. Jeśli ponowne otwarcie offline nie działa, to osobny bloker obsługi pracy offline, nawet jeżeli punkty odzyskają się po powrocie internetu. Nie zastępować tego testu zwykłym schowaniem aplikacji.

### GPS-04 — zakończenie sesji bez internetu

1. Uruchomić S1 online, odłączyć sieć, przejść 200 m i zapisać kolejkę.
2. Zakończyć S1 offline o czasie T. Zapisać komunikat, stan sesji oraz oczekującą operację zakończenia.
3. Przejść kolejne 200 m przez 3 minuty. Liczba nowych punktów dla S1 nie może rosnąć; po T nie może powstawać nowy ślad.
4. Zamknąć i ponownie otworzyć aplikację nadal offline. Powtórzyć spacer. Nieaktualny widok aktywnej sesji nie może wznowić śledzenia.
5. Przywrócić internet. Po synchronizacji sprawdzić jedno zakończenie S1 z czasem T i punkty sprzed T. W razie konfliktu zachować eksport; nie odrzucać automatycznie.
6. Uruchomić S2 i przejść kolejne 100 m. Żaden zaległy punkt S1 nie może znaleźć się w S2.

Zaliczenie: lokalne zatrzymanie działa przed odpowiedzią serwera, przetrwa restart, nie gubi wcześniejszych punktów; sesja kończy się jednokrotnie. Punkty graniczne po T nie są przypisywane do S2 ani po cichu usuwane. Opóźnione przesłanie punktów sprzed T działa także po zamknięciu S1 na serwerze. Powtórzyć próbę z opcją anulowania sesji, jeśli dostępna w danym procesie.

### GPS-05 — dwie karty i stary stan sesji

W Safari lub przeglądarce Android otworzyć tę samą aktywną sesję w dwóch kartach. Zakończyć offline w pierwszej, przejść do drugiej, wykonać spacer i przeładowanie. Zaliczenie: druga karta nie wznawia GPS dla zamkniętej lokalnie sesji, a powrót sieci nie duplikuje już utrwalonych identyfikatorów. Oddzielne pomiary z dwóch watcherów mogą mieć różne ID — nie mylić ich z powtórną wysyłką tego samego punktu.

### GPS-06 — granice uprawnień i sesja stacjonarna

Sprawdzić brak zbierania przed startem, po zakończeniu i w sesji stacjonarnej DUR. Odebrać zgodę lokalizacji podczas aktywnej sesji, następnie przywrócić. Zaliczenie: brak pozornego sukcesu przy braku zgody; wcześniej zapisane punkty nie znikają. Po zmianie konta zaległe punkty pierwszego pracownika nie trafiają do sesji drugiego. Następnie zalogować pierwsze konto i sprawdzić odzyskanie synchronizacji.

## Protokół pojedynczej próby

| Pole | Wpis testera |
|---|---|
| Scenariusz i powtórzenie | |
| Data, tester, model, system | |
| APK/Safari/PWA, commit web i APK | |
| Konto testowe, ID sesji S1/S2 | |
| Zgody lokalizacji, oszczędzanie baterii | |
| Czasy: sieć off/on, blokada, zamknięcie, koniec T | |
| Kolejka przed/po, plik eksportu | |
| Liczba punktów eksportu potwierdzonych w DB | |
| Luki śladu i ich czas; duplikaty tego samego ID | |
| Wynik: ZALICZONY / NIEZALICZONY / BLOKADA / NIE WYKONANO | |
| Dowód, opis błędu, osoba odpowiedzialna | |

## Warunek uruchomienia pilotażu

Każdy scenariusz wykonać co najmniej dwa razy na każdej docelowej konfiguracji. Żaden utrwalony poprawny punkt nie może zaginąć ani zostać przypisany do innej sesji/osoby. Śledzenie nie może trwać po lokalnym końcu. Niewyjaśnione zaległości i niemożliwy restart offline pozostają otwartymi problemami. Wymaganie GPS w tle należy ocenić oddzielnie od trwałości kolejki. Zakończenie testów na kilku urządzeniach nie jest testem obciążenia 40 pracowników; wdrożenie etapowe i test obciążenia pozostają osobnymi warunkami.
