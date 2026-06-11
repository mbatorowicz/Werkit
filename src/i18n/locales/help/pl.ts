import type { HelpPageContent } from "@/types/help";

/** Treść instrukcji obsługi (PL) — SSOT dla ekranów pomocy i docs/USER_MANUAL.md. */
export const helpPl = {
  worker: {
    title: "Instrukcja Obsługi",
    backLabel: "Powrót do sesji",
    userManual: "Podręcznik Użytkownika",
    contact: {
      quickContact: "Szybki kontakt z bazą",
      contactDesc:
        "Masz problem z zasobem, ładunkiem lub aplikacją? Skontaktuj się bezpośrednio z biurem.",
      callDispatcher: "Zadzwoń do dyspozytora",
    },
    emergency: {
      title: "Procedura awaryjna",
      body: "W przypadku kolizji, awarii zasobu lub innego zagrożenia zatrzymaj pracę w bezpiecznym miejscu, zabezpiecz ładunek i użyj przycisku telefonu u góry ekranu, aby poinformować dyspozytora. Jeśli to możliwe, wykonaj zdjęcie sytuacji w aplikacji.",
    },
    sections: [
      {
        id: "start-work",
        title: "1. Rozpoczynanie pracy",
        paragraphs: [
          "Gdy wejdziesz w zakładkę Sesja, zobaczysz listę zleceń przygotowanych dla Ciebie przez dyspozytora.",
          "Aby rozpocząć pracę, kliknij duży przycisk «Rozpocznij to zlecenie». Od tego momentu aplikacja zacznie rejestrować Twój czas pracy oraz (jeśli to wymagane) trasę GPS.",
        ],
        bullets: [
          "Kolor czerwony — zlecenie przeterminowane. Powinno być wykonane w pierwszej kolejności.",
          "Kolor różowy — zlecenie zbliżające się (np. zaplanowane na najbliższe godziny).",
          "Priorytety — niektóre zlecenia mają wysoki priorytet (PILNE, WAŻNY). Zwracaj na to uwagę.",
          "Po rozpoczęciu sesji możesz anulować start tylko w oknie czasowym ustawionym przez firmę.",
        ],
      },
      {
        id: "notes-photos",
        title: "2. Notatki i zdjęcia z trasy",
        paragraphs: [
          "Podczas trwania zlecenia na ekranie głównym pojawiają się przyciski dokumentacji.",
          "Ważne: niektóre zlecenia mogą wymagać co najmniej jednego zdjęcia przed zakończeniem sesji.",
        ],
        bullets: [
          "Dodaj notatkę — zapis ważnej informacji z drogi (np. korek, odmowa klienta). Notatka jest przypisana do lokalizacji GPS.",
          "Zrób zdjęcie — uruchamia aparat. Służy do dokumentacji pracy (rozładunek, awaria, podpisy na WZ).",
          "Zgłoś dotarcie na miejsce — checkpoint potwierdzający przyjazd (geofencing, jeśli włączony).",
        ],
      },
      {
        id: "gps-tracking",
        title: "3. Śledzenie i GPS",
        paragraphs: [
          "Aplikacja używa sygnału satelitarnego do wyznaczania przebytej trasy (gdy kategoria zlecenia tego wymaga).",
          "GPS jest włączany tylko i wyłącznie w momencie aktywnego zlecenia. Po kliknięciu «Zakończ» aplikacja przestaje pobierać lokalizację — chroni to baterię i prywatność.",
        ],
        bullets: [
          "Status «Szukam…» (żółty) — telefon szuka satelity. Upewnij się, że nie jesteś w podziemnym garażu.",
          "Status «Połączono» (zielony) — GPS działa prawidłowo.",
          "Kategorie stacjonarne — bez śledzenia trasy i mapy; możesz normalnie dodawać notatki i zdjęcia.",
        ],
      },
      {
        id: "custom-orders",
        title: "4. Zlecenia własne",
        paragraphs: [
          "Jeśli administrator nadał Ci uprawnienie, na ekranie powitalnym znajdziesz przycisk «LUB ZDEFINIUJ WŁASNE».",
          "Pozwala samodzielnie wybrać klienta, zasób i materiał oraz natychmiast rozpocząć pracę bez czekania na zlecenie z biura.",
        ],
      },
      {
        id: "wizard",
        title: "5. Kreator własnego zlecenia",
        paragraphs: [
          "Kreator prowadzi krok po kroku przez utworzenie zlecenia: kategoria → zasób → szczegóły (materiał, klient, ilość, opis) → harmonogram → podsumowanie.",
          "Po zatwierdzeniu zlecenie startuje od razu jako aktywna sesja.",
        ],
        bullets: [
          "Wymaga uprawnienia «własne zlecenia» od administratora.",
          "Opcjonalnie możesz dodać nowego klienta, jeśli masz uprawnienie tworzenia klientów.",
          "W trakcie sesji możesz edytować niektóre pola własnego zlecenia z poziomu szczegółów sesji.",
        ],
      },
      {
        id: "delegation",
        title: "6. Delegacja zleceń",
        paragraphs: [
          "Lider z uprawnieniem delegacji może przypisać zlecenie innemu pracownikowi bezpośrednio z ekranu Sesja.",
        ],
        bullets: [
          "Wybierz pracownika, kategorię, zasób, opis zadania i termin.",
          "Zlecenie trafia do listy oczekujących wybranego pracownika.",
        ],
      },
      {
        id: "offline",
        title: "7. Tryb offline i kolejka",
        paragraphs: [
          "Przy braku internetu aplikacja zapisuje operacje lokalnie i wysyła je po przywróceniu połączenia.",
        ],
        bullets: [
          "Baner informuje o liczbie oczekujących operacji (zakończenie sesji, notatki, zdjęcia, checkpoint).",
          "Nie zamykaj aplikacji na długo po powrocie sieci — poczekaj na synchronizację.",
          "Kolejka zleceń po sesji — kolejne oczekujące zlecenia od dyspozycji (podgląd, bez akceptacji).",
        ],
      },
      {
        id: "alarms",
        title: "8. Alarmy i przypomnienia",
        paragraphs: ["Aplikacja może ostrzegać dźwiękiem i powiadomieniem o ważnych zdarzeniach."],
        bullets: [
          "Zlecenie opóźnione — termin startu minął.",
          "Zbliżający się termin — zlecenie zaplanowane na najbliższe godziny.",
          "Przekroczenie czasu — szacowany czas zlecenia został przekroczony (ustawienie firmy).",
          "Możesz odłożyć alarm (snooze) lub szybko rozpocząć zlecenie z powiadomienia.",
          "Preferencje dźwięków i powiadomień zmienisz w Profil.",
        ],
      },
      {
        id: "navigation",
        title: "9. Nawigacja i edycja trasy",
        paragraphs: [
          "Gdy moduł GPS jest włączony dla organizacji, podczas sesji widzisz mapę, dystans i planowaną trasę.",
        ],
        bullets: [
          "Nawigacja krok po kroku (turn-by-turn) — gdy włączona przez platformę.",
          "Edycja trasy — dostępna, jeśli administrator nadał uprawnienie «edycja trasy».",
          "Trasa przejechana jest zapisywana i widoczna w Historii po zakończeniu sesji.",
        ],
      },
      {
        id: "history",
        title: "10. Historia pracy",
        paragraphs: [
          "Zakładka Historia zawiera listę zakończonych sesji. Szczegół pokazuje mapę trasy, galerię zdjęć i notatki na osi czasu.",
          "To archiwum tylko do odczytu — korekty zgłaszaj dyspozytorowi.",
        ],
      },
      {
        id: "dur-parts",
        title: "11. Części zamienne (DUR)",
        paragraphs: [
          "Przy zleceniach naprawy i uprawnieniu pracownika serwisowego DUR pojawia się panel części na aktywnej sesji.",
        ],
        bullets: [
          "Pobranie części — rejestruje wydanie z magazynu (WZ) na zlecenie.",
          "Zwrot części — rejestruje przyjęcie (PZ) do magazynu.",
          "Moduł DUR musi być włączony dla organizacji przez superadmina.",
        ],
      },
      {
        id: "profile",
        title: "12. Profil i powiadomienia",
        paragraphs: [
          "W Profilu sprawdzisz dane konta, strukturę organizacyjną oraz ustawienia powiadomień i logowania biometrycznego (APK).",
          "Administratorzy mogą przejść stąd do panelu dyspozytora.",
        ],
      },
    ],
  } satisfies HelpPageContent,

  admin: {
    title: "Instrukcja obsługi — panel dyspozytora",
    backLabel: "Powrót do panelu",
    intro:
      "Panel administratora służy do planowania zleceń, zarządzania zasobami firmy i podglądu pracy w terenie. Opis modułów menu bocznego.",
    userManual: "Podręcznik dyspozytora",
    sections: [
      {
        id: "intro",
        title: "1. Wprowadzenie — role i dostęp",
        paragraphs: ["Po zalogowaniu trafiasz do panelu zgodnie z rolą konta."],
        bullets: [
          "Administrator — pełna edycja: zlecenia, słowniki, ustawienia, logi.",
          "Podgląd (viewer) — ten sam widok, bez możliwości zapisywania i usuwania.",
          "Delegacja — lider widzi ograniczone menu (Zlecenia, Raport, Ludzie) i może tworzyć zlecenia.",
          "Pracownik terenowy korzysta z aplikacji /worker (PWA lub APK Android).",
          "Wersja web i APK powinny być zsynchronizowane — sprawdź w Ustawieniach Firmy.",
        ],
      },
      {
        id: "dispatch",
        title: "2. Dyspozytornia (Zlecenia)",
        paragraphs: [
          "Główny ekran planowania: oś czasu (Gantt) pracowników, lista zleceń i sesji, panel kategorii zleceń.",
        ],
        bullets: [
          "Tworzenie zlecenia — wybierz pracownika, kategorię, zasób, klienta, materiał, priorytet i termin.",
          "Priorytety: PILNE, WYSOKI, NORMALNY, NISKI.",
          "Rodzaj zlecenia: praca zasobem, naprawa (warsztat) lub transport — zależy od kategorii.",
          "Konflikty harmonogramu — system ostrzeże przy nakładających się terminach.",
          "Aktywne sesje — podgląd na żywo; administrator może wymusić zakończenie sesji.",
          "Ewidencja — zakończone sesje w archiwum; trwałe usunięcie wymaga hasła administratora.",
          "Kategorie zleceń — hierarchia grup i liści; liście definiują pola formularza i widoczność mapy.",
          "Deep link ?open={id} — otwiera szczegóły zlecenia z zewnętrznego linku.",
        ],
      },
      {
        id: "reports",
        title: "3. Raport",
        paragraphs: [
          "Pulpit analityczny: KPI, aktywne sesje wg kategorii, tabela «kto pracuje», mapa na żywo, efektywność miesiąca.",
        ],
        bullets: [
          "Dane tylko do odczytu — służą do monitorowania, nie do edycji zleceń.",
          "Mapa wymaga włączonego modułu GPS dla organizacji.",
        ],
      },
      {
        id: "people",
        title: "4. Ludzie i struktura",
        paragraphs: [
          "Jedno miejsce na konta użytkowników i strukturę organizacyjną: departamenty → zespoły → członkowie.",
        ],
        bullets: [
          "Role konta: administrator, podgląd, pracownik terenowy.",
          "Uprawnienia workera: własne zlecenia, edycja trasy, tworzenie klientów, pracownik serwisowy DUR.",
          "Przypisanie przełożonego (reportsTo) i struktury org. wpływa na delegację.",
          "Nieprzypisani użytkownicy — lista kont bez zespołu.",
        ],
      },
      {
        id: "resources",
        title: "5. Zasoby (flota)",
        paragraphs: ["Rejestr maszyn i urządzeń firmy z kategoriami zasobów."],
        bullets: [
          "Kategorie zasobów — drzewo grup i liści do klasyfikacji floty.",
          "Typ zasobu (DUR) — model/rodzina maszyny; wiele egzemplarzy może mieć ten sam typ.",
          "Status zasobu — dostępność przy planowaniu zleceń.",
          "Nie usuń zasobu przypisanego do aktywnej lub historycznej sesji.",
        ],
      },
      {
        id: "materials",
        title: "6. Materiały",
        paragraphs: ["Katalog materiałów z kategoriami oraz rejestr ruchów magazynowych."],
        bullets: [
          "Kategorie materiałów — hierarchia; liście używane w zleceniach.",
          "Przyjęcia (PZ) i wydania (WZ) materiałów — historia i aktualny stan.",
          "Niski stan — alert gdy ilość spadnie poniżej minimum.",
        ],
      },
      {
        id: "customers",
        title: "7. Klienci",
        paragraphs: ["Baza kontrahentów z danymi kontaktowymi i domyślnym adresem."],
        bullets: [
          "Wyszukiwanie po nazwie i danych kontaktowych.",
          "Klient przypisany do zleceń nie może zostać usunięty.",
          "Lokalizacje klienta używane przy planowaniu trasy i geofencingu.",
        ],
      },
      {
        id: "dur-warehouse",
        title: "8. Magazyn DUR (utrzymanie ruchu)",
        paragraphs: ["Moduł widoczny, gdy superadmin włączył DUR dla organizacji."],
        bullets: [
          "Katalog części zamiennych (SKU, kategoria, typ zasobu, stan).",
          "Przyjęcia (PZ) i wydania (WZ) części — z fakturą, ceną lub na zlecenie/pracownika.",
          "Korekta stanu — inwentaryzacja i korekty ręczne z opisem przyczyny.",
          "Kategorie części — osobne drzewo kategorii DUR.",
          "Części na zleceniu naprawy: formularz zlecenia i panel workera.",
        ],
      },
      {
        id: "settings",
        title: "9. Ustawienia firmy",
        paragraphs: ["Dane firmy, reguły sesji w aplikacji pracownika oraz pobieranie APK."],
        bullets: [
          "Nazwa, adres, telefon, e-mail — telefon widoczny w Pomocy workera.",
          "Baza GPS firmy — punkt odniesienia dla zasobów warsztatowych.",
          "Okno anulowania startu, wymóg zdjęcia przy zakończeniu, geofencing, przypomnienia.",
          "Karta APK — wersja web vs Android; pobierz aktualną aplikację.",
        ],
      },
      {
        id: "logs",
        title: "10. Logi urządzeń",
        paragraphs: [
          "Zdalny podgląd zdarzeń z urządzeń pracowników: GPS, sesje, błędy HTTP, powiadomienia.",
        ],
        bullets: [
          "Filtry: poziom (INFO/WARN/ERROR), kategoria, użytkownik, czas.",
          "Eksport JSON — do {exportMax} najnowszych wpisów.",
          "Przydatne przy diagnostyce problemów w terenie (GPS w tle, offline).",
        ],
      },
      {
        id: "viewer",
        title: "11. Rola podglądu (viewer)",
        paragraphs: [
          "Konto podglądu widzi te same ekrany co administrator, ale bez przycisków zapisu, usuwania i tworzenia.",
        ],
        bullets: [
          "Przeznaczone dla kierownictwa i audytu operacyjnego.",
          "Nie można zmieniać ustawień firmy ani kont użytkowników.",
        ],
      },
    ],
    glossary: {
      title: "Słownik pojęć",
      terms: [
        {
          term: "Typ zasobu",
          definition:
            "Model lub rodzina maszyny (np. kapsułkarka 02A). Wiele egzemplarzy floty może należeć do jednego typu — moduł DUR.",
        },
        {
          term: "Kategoria zlecenia",
          definition:
            "Słownik definiujący rodzaj pracy (transport, praca zasobem, naprawa). Określa widoczne pola formularza i czy włączyć mapę/GPS.",
        },
        {
          term: "Rodzaj zlecenia (orderType)",
          definition:
            "Wewnętrzna klasyfikacja: praca maszyną, naprawa lub transport — wynika z kategorii, nie mylić z «typem zlecenia» w potocznym języku.",
        },
        {
          term: "Sesja",
          definition:
            "Aktywny okres pracy pracownika nad jednym zleceniem — od «Rozpocznij» do «Zakończ».",
        },
        {
          term: "Zlecenie",
          definition:
            "Zadanie zaplanowane przez dyspozytora lub utworzone przez pracownika; może mieć wiele sesji w historii.",
        },
      ],
    },
  } satisfies HelpPageContent,

  platform: {
    title: "Instrukcja obsługi — konsola platformy",
    backLabel: "Powrót do organizacji",
    intro:
      "Konsola superadmina służy do zakładania organizacji (tenantów), zarządzania ich statusem i włączania modułów funkcjonalnych.",
    userManual: "Podręcznik superadmina",
    sections: [
      {
        id: "register",
        title: "1. Rejestracja organizacji",
        paragraphs: [
          "Formularz rejestracji tworzy nową organizację z unikalnym identyfikatorem (slug) i opcjonalnie konto administratora startowego.",
        ],
        bullets: [
          "Nazwa organizacji — wyświetlana w panelu admina.",
          "Identyfikator (slug) — używany w logice multi-tenant; musi być unikalny.",
          "Konto admina — e-mail jako login, hasło początkowe przekaż bezpiecznym kanałem.",
        ],
      },
      {
        id: "manage",
        title: "2. Zarządzanie organizacjami",
        paragraphs: [
          "Tabela organizacji pokazuje wskaźniki użycia i pozwala edytować dane oraz status.",
        ],
        bullets: [
          "Status aktywna — użytkownicy mogą się logować.",
          "Status zawieszona — blokada dostępu do organizacji.",
          "Dodawanie kolejnego administratora do istniejącej organizacji.",
        ],
      },
      {
        id: "feature-flags",
        title: "3. Ustawienia funkcji (feature flags)",
        paragraphs: [
          "Każda organizacja może mieć włączone lub wyłączone moduły niezależnie od innych.",
        ],
        bullets: [
          "Moduł GPS i mapa — śledzenie pozycji, widok mapy, geofencing, planowanie trasy OSRM, nawigacja turn-by-turn.",
          "Moduł utrzymania ruchu (DUR) — magazyn części, typy zasobów, części na zleceniach napraw.",
          "Zmiany zapisuj osobno dla każdej organizacji — wpływają natychmiast na widoczność menu.",
        ],
      },
      {
        id: "metrics",
        title: "4. Wskaźniki użycia",
        paragraphs: ["Kolumny tabeli pomagają monitorować adopcję systemu."],
        bullets: [
          "Konta i pracownicy — liczba użytkowników w organizacji.",
          "Sesje (30 dni) — aktywność terenowa.",
          "Zlecenia oczekujące — obciążenie dyspozytorni.",
          "Logi urządzeń (7 dni) — wolumen diagnostyki z pola.",
        ],
      },
    ],
  } satisfies HelpPageContent,
} as const;
