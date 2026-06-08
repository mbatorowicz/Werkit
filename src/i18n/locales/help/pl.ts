import type { HelpPageContent } from "@/types/help";

/** Treœæ instrukcji obs³ugi (PL) — SSOT dla ekranów pomocy i docs/USER_MANUAL.md. */
export const helpPl = {
  worker: {
    title: "Instrukcja Obs³ugi",
    backLabel: "Powrót do sesji",
    userManual: "Podrêcznik U¿ytkownika",
    contact: {
      quickContact: "Szybki kontakt z baz¹",
      contactDesc:
        "Masz problem z zasobem, ³adunkiem lub aplikacj¹? Skontaktuj siê bezpoœrednio z biurem.",
      callDispatcher: "Zadzwoñ do dyspozytora",
    },
    emergency: {
      title: "Procedura awaryjna",
      body: "W przypadku kolizji, awarii zasobu lub innego zagro¿enia zatrzymaj pracê w bezpiecznym miejscu, zabezpiecz ³adunek i u¿yj przycisku telefonu u góry ekranu, aby poinformowaæ dyspozytora. Jeœli to mo¿liwe, wykonaj zdjêcie sytuacji w aplikacji.",
    },
    sections: [
      {
        id: "start-work",
        title: "1. Rozpoczynanie pracy",
        paragraphs: [
          "Gdy wejdziesz w zak³adkê Sesja, zobaczysz listê zleceñ przygotowanych dla Ciebie przez dyspozytora.",
          "Aby rozpocz¹æ pracê, kliknij du¿y przycisk «Rozpocznij to zlecenie». Od tego momentu aplikacja zacznie rejestrowaæ Twój czas pracy oraz (jeœli to wymagane) trasê GPS.",
        ],
        bullets: [
          "Kolor czerwony — zlecenie przeterminowane. Powinno byæ wykonane w pierwszej kolejnoœci.",
          "Kolor ró¿owy — zlecenie zbli¿aj¹ce siê (np. zaplanowane na najbli¿sze godziny).",
          "Priorytety — niektóre zlecenia maj¹ wysoki priorytet (PILNE, WA¯NY). Zwracaj na to uwagê.",
          "Po rozpoczêciu sesji mo¿esz anulowaæ start tylko w oknie czasowym ustawionym przez firmê.",
        ],
      },
      {
        id: "notes-photos",
        title: "2. Notatki i zdjêcia z trasy",
        paragraphs: [
          "Podczas trwania zlecenia na ekranie g³ównym pojawiaj¹ siê przyciski dokumentacji.",
          "Wa¿ne: niektóre zlecenia mog¹ wymagaæ co najmniej jednego zdjêcia przed zakoñczeniem sesji.",
        ],
        bullets: [
          "Dodaj notatkê — zapis wa¿nej informacji z drogi (np. korek, odmowa klienta). Notatka jest przypisana do lokalizacji GPS.",
          "Zrób zdjêcie — uruchamia aparat. S³u¿y do dokumentacji pracy (roz³adunek, awaria, podpisy na WZ).",
          "Zg³oœ dotarcie na miejsce — checkpoint potwierdzaj¹cy przyjazd (geofencing, jeœli w³¹czony).",
        ],
      },
      {
        id: "gps-tracking",
        title: "3. Œledzenie i GPS",
        paragraphs: [
          "Aplikacja u¿ywa sygna³u satelitarnego do wyznaczania przebytej trasy (gdy kategoria zlecenia tego wymaga).",
          "GPS jest w³¹czany tylko i wy³¹cznie w momencie aktywnego zlecenia. Po klikniêciu «Zakoñcz» aplikacja przestaje pobieraæ lokalizacjê — chroni to bateriê i prywatnoœæ.",
        ],
        bullets: [
          "Status «Szukam…» (¿ó³ty) — telefon szuka satelity. Upewnij siê, ¿e nie jesteœ w podziemnym gara¿u.",
          "Status «Po³¹czono» (zielony) — GPS dzia³a prawid³owo.",
          "Kategorie stacjonarne — bez œledzenia trasy i mapy; mo¿esz normalnie dodawaæ notatki i zdjêcia.",
        ],
      },
      {
        id: "custom-orders",
        title: "4. Zlecenia w³asne",
        paragraphs: [
          "Jeœli administrator nada³ Ci uprawnienie, na ekranie powitalnym znajdziesz przycisk «LUB ZDEFINIUJ W£ASNE».",
          "Pozwala samodzielnie wybraæ klienta, zasób i materia³ oraz natychmiast rozpocz¹æ pracê bez czekania na zlecenie z biura.",
        ],
      },
      {
        id: "wizard",
        title: "5. Kreator w³asnego zlecenia",
        paragraphs: [
          "Kreator prowadzi krok po kroku przez utworzenie zlecenia: kategoria › zasób › szczegó³y (materia³, klient, iloœæ, opis) › harmonogram › podsumowanie.",
          "Po zatwierdzeniu zlecenie startuje od razu jako aktywna sesja.",
        ],
        bullets: [
          "Wymaga uprawnienia «w³asne zlecenia» od administratora.",
          "Opcjonalnie mo¿esz dodaæ nowego klienta, jeœli masz uprawnienie tworzenia klientów.",
          "W trakcie sesji mo¿esz edytowaæ niektóre pola w³asnego zlecenia z poziomu szczegó³ów sesji.",
        ],
      },
      {
        id: "delegation",
        title: "6. Delegacja zleceñ",
        paragraphs: [
          "Lider z uprawnieniem delegacji mo¿e przypisaæ zlecenie innemu pracownikowi bezpoœrednio z ekranu Sesja.",
        ],
        bullets: [
          "Wybierz pracownika, kategoriê, zasób, opis zadania i termin.",
          "Zlecenie trafia do listy oczekuj¹cych wybranego pracownika.",
        ],
      },
      {
        id: "offline",
        title: "7. Tryb offline i kolejka",
        paragraphs: [
          "Przy braku internetu aplikacja zapisuje operacje lokalnie i wysy³a je po przywróceniu po³¹czenia.",
        ],
        bullets: [
          "Baner informuje o liczbie oczekuj¹cych operacji (zakoñczenie sesji, notatki, zdjêcia, checkpoint).",
          "Nie zamykaj aplikacji na d³ugo po powrocie sieci — poczekaj na synchronizacjê.",
          "Kolejka zleceñ po sesji — dyspozycja mo¿e przygotowaæ kolejne zadania; rozwiñ listê, aby zaplanowaæ pracê (nie akceptujesz ich st¹d).",
        ],
      },
      {
        id: "alarms",
        title: "8. Alarmy i przypomnienia",
        paragraphs: [
          "Aplikacja mo¿e ostrzegaæ dŸwiêkiem i powiadomieniem o wa¿nych zdarzeniach.",
        ],
        bullets: [
          "Zlecenie opóŸnione — termin startu min¹³.",
          "Zbli¿aj¹cy siê termin — zlecenie zaplanowane na najbli¿sze godziny.",
          "Przekroczenie czasu — szacowany czas zlecenia zosta³ przekroczony (ustawienie firmy).",
          "Mo¿esz od³o¿yæ alarm (snooze) lub szybko rozpocz¹æ zlecenie z powiadomienia.",
          "Preferencje dŸwiêków i powiadomieñ zmienisz w Profil.",
        ],
      },
      {
        id: "navigation",
        title: "9. Nawigacja i edycja trasy",
        paragraphs: [
          "Gdy modu³ GPS jest w³¹czony dla organizacji, podczas sesji widzisz mapê, dystans i planowan¹ trasê.",
        ],
        bullets: [
          "Nawigacja krok po kroku (turn-by-turn) — gdy w³¹czona przez platformê.",
          "Edycja trasy — dostêpna, jeœli administrator nada³ uprawnienie «edycja trasy».",
          "Trasa przejechana jest zapisywana i widoczna w Historii po zakoñczeniu sesji.",
        ],
      },
      {
        id: "history",
        title: "10. Historia pracy",
        paragraphs: [
          "Zak³adka Historia zawiera listê zakoñczonych sesji. Szczegó³ pokazuje mapê trasy, galeriê zdjêæ i notatki na osi czasu.",
          "To archiwum tylko do odczytu — korekty zg³aszaj dyspozytorowi.",
        ],
      },
      {
        id: "dur-parts",
        title: "11. Czêœci zamienne (DUR)",
        paragraphs: [
          "Przy zleceniach naprawy i uprawnieniu pracownika serwisowego DUR pojawia siê panel czêœci na aktywnej sesji.",
        ],
        bullets: [
          "Pobranie czêœci — rejestruje wydanie z magazynu (WZ) na zlecenie.",
          "Zwrot czêœci — rejestruje przyjêcie (PZ) do magazynu.",
          "Modu³ DUR musi byæ w³¹czony dla organizacji przez superadmina.",
        ],
      },
      {
        id: "profile",
        title: "12. Profil i powiadomienia",
        paragraphs: [
          "W Profilu sprawdzisz dane konta, strukturê organizacyjn¹ oraz ustawienia powiadomieñ i logowania biometrycznego (APK).",
          "Administratorzy mog¹ przejœæ st¹d do panelu dyspozytora.",
        ],
      },
    ],
  } satisfies HelpPageContent,

  admin: {
    title: "Instrukcja obs³ugi — panel dyspozytora",
    backLabel: "Powrót do panelu",
    intro:
      "Panel administratora s³u¿y do planowania zleceñ, zarz¹dzania zasobami firmy i podgl¹du pracy w terenie. Poni¿ej opis modu³ów w kolejnoœci menu bocznego.",
    userManual: "Podrêcznik dyspozytora",
    sections: [
      {
        id: "intro",
        title: "1. Wprowadzenie — role i dostêp",
        paragraphs: [
          "Po zalogowaniu trafiasz do panelu zgodnie z rol¹ konta.",
        ],
        bullets: [
          "Administrator — pe³na edycja: zlecenia, s³owniki, ustawienia, logi.",
          "Podgl¹d (viewer) — ten sam widok, bez mo¿liwoœci zapisywania i usuwania.",
          "Delegacja — lider widzi ograniczone menu (Zlecenia, Raport, Ludzie) i mo¿e tworzyæ zlecenia.",
          "Pracownik terenowy korzysta z aplikacji /worker (PWA lub APK Android).",
          "Wersja web i APK powinny byæ zsynchronizowane — sprawdŸ w Ustawieniach Firmy.",
        ],
      },
      {
        id: "dispatch",
        title: "2. Dyspozytornia (Zlecenia)",
        paragraphs: [
          "G³ówny ekran planowania: oœ czasu (Gantt) pracowników, lista zleceñ i sesji, panel kategorii zleceñ.",
        ],
        bullets: [
          "Tworzenie zlecenia — wybierz pracownika, kategoriê, zasób, klienta, materia³, priorytet i termin.",
          "Priorytety: PILNE, WYSOKI, NORMALNY, NISKI.",
          "Rodzaj zlecenia: praca zasobem, naprawa (warsztat) lub transport — zale¿y od kategorii.",
          "Konflikty harmonogramu — system ostrze¿e przy nak³adaj¹cych siê terminach.",
          "Aktywne sesje — podgl¹d na ¿ywo; administrator mo¿e wymusiæ zakoñczenie sesji.",
          "Ewidencja — zakoñczone sesje w archiwum; trwa³e usuniêcie wymaga has³a administratora.",
          "Kategorie zleceñ — hierarchia grup i liœci; liœcie definiuj¹ pola formularza i widocznoœæ mapy.",
          "Deep link ?open={id} — otwiera szczegó³y zlecenia z zewnêtrznego linku.",
        ],
      },
      {
        id: "reports",
        title: "3. Raport",
        paragraphs: [
          "Pulpit analityczny: KPI, aktywne sesje wg kategorii, tabela «kto pracuje», mapa na ¿ywo, efektywnoœæ miesi¹ca.",
        ],
        bullets: [
          "Dane tylko do odczytu — s³u¿¹ do monitorowania, nie do edycji zleceñ.",
          "Mapa wymaga w³¹czonego modu³u GPS dla organizacji.",
        ],
      },
      {
        id: "people",
        title: "4. Ludzie i struktura",
        paragraphs: [
          "Jedno miejsce na konta u¿ytkowników i strukturê organizacyjn¹: departamenty › zespo³y › cz³onkowie.",
        ],
        bullets: [
          "Role konta: administrator, podgl¹d, pracownik terenowy.",
          "Uprawnienia workera: w³asne zlecenia, edycja trasy, tworzenie klientów, pracownik serwisowy DUR.",
          "Przypisanie prze³o¿onego (reportsTo) i struktury org. wp³ywa na delegacjê.",
          "Nieprzypisani u¿ytkownicy — lista kont bez zespo³u.",
        ],
      },
      {
        id: "resources",
        title: "5. Zasoby (flota)",
        paragraphs: [
          "Rejestr maszyn i urz¹dzeñ firmy z kategoriami zasobów.",
        ],
        bullets: [
          "Kategorie zasobów — drzewo grup i liœci do klasyfikacji floty.",
          "Typ zasobu (DUR) — model/rodzina maszyny; wiele egzemplarzy mo¿e mieæ ten sam typ.",
          "Status zasobu — dostêpnoœæ przy planowaniu zleceñ.",
          "Nie usuñ zasobu przypisanego do aktywnej lub historycznej sesji.",
        ],
      },
      {
        id: "materials",
        title: "6. Materia³y",
        paragraphs: [
          "Katalog materia³ów z kategoriami oraz rejestr ruchów magazynowych.",
        ],
        bullets: [
          "Kategorie materia³ów — hierarchia; liœcie u¿ywane w zleceniach.",
          "Przyjêcia (PZ) i wydania (WZ) materia³ów — historia i aktualny stan.",
          "Niski stan — alert gdy iloœæ spadnie poni¿ej minimum.",
        ],
      },
      {
        id: "customers",
        title: "7. Klienci",
        paragraphs: [
          "Baza kontrahentów z danymi kontaktowymi i domyœlnym adresem.",
        ],
        bullets: [
          "Wyszukiwanie po nazwie i danych kontaktowych.",
          "Klient przypisany do zleceñ nie mo¿e zostaæ usuniêty.",
          "Lokalizacje klienta u¿ywane przy planowaniu trasy i geofencingu.",
        ],
      },
      {
        id: "dur-warehouse",
        title: "8. Magazyn DUR (utrzymanie ruchu)",
        paragraphs: [
          "Modu³ widoczny, gdy superadmin w³¹czy³ DUR dla organizacji.",
        ],
        bullets: [
          "Katalog czêœci zamiennych (SKU, kategoria, typ zasobu, stan).",
          "Przyjêcia (PZ) i wydania (WZ) czêœci — z faktur¹, cen¹ lub na zlecenie/pracownika.",
          "Korekta stanu — inwentaryzacja i korekty rêczne z opisem przyczyny.",
          "Kategorie czêœci — osobne drzewo kategorii DUR.",
          "Czêœci na zleceniu naprawy — sekcja w formularzu zlecenia i panel workera.",
        ],
      },
      {
        id: "settings",
        title: "9. Ustawienia firmy",
        paragraphs: [
          "Dane firmy, regu³y sesji w aplikacji pracownika oraz pobieranie APK.",
        ],
        bullets: [
          "Nazwa, adres, telefon, e-mail — telefon widoczny w Pomocy workera.",
          "Baza GPS firmy — punkt odniesienia dla zasobów warsztatowych.",
          "Okno anulowania startu, wymóg zdjêcia przy zakoñczeniu, geofencing, przypomnienia.",
          "Karta APK — wersja web vs Android; pobierz aktualn¹ aplikacjê.",
        ],
      },
      {
        id: "logs",
        title: "10. Logi urz¹dzeñ",
        paragraphs: [
          "Zdalny podgl¹d zdarzeñ z urz¹dzeñ pracowników: GPS, sesje, b³êdy HTTP, powiadomienia.",
        ],
        bullets: [
          "Filtry: poziom (INFO/WARN/ERROR), kategoria, u¿ytkownik, czas.",
          "Eksport JSON — do {exportMax} najnowszych wpisów.",
          "Przydatne przy diagnostyce problemów w terenie (GPS w tle, offline).",
        ],
      },
      {
        id: "viewer",
        title: "11. Rola podgl¹du (viewer)",
        paragraphs: [
          "Konto podgl¹du widzi te same ekrany co administrator, ale bez przycisków zapisu, usuwania i tworzenia.",
        ],
        bullets: [
          "Przeznaczone dla kierownictwa i audytu operacyjnego.",
          "Nie mo¿na zmieniaæ ustawieñ firmy ani kont u¿ytkowników.",
        ],
      },
    ],
    glossary: {
      title: "S³ownik pojêæ",
      terms: [
        {
          term: "Typ zasobu",
          definition:
            "Model lub rodzina maszyny (np. kapsu³karka 02A). Wiele egzemplarzy floty mo¿e nale¿eæ do jednego typu — modu³ DUR.",
        },
        {
          term: "Kategoria zlecenia",
          definition:
            "S³ownik definiuj¹cy rodzaj pracy (transport, praca zasobem, naprawa). Okreœla widoczne pola formularza i czy w³¹czyæ mapê/GPS.",
        },
        {
          term: "Rodzaj zlecenia (orderType)",
          definition:
            "Wewnêtrzna klasyfikacja: praca maszyn¹, naprawa lub transport — wynika z kategorii, nie myliæ z «typem zlecenia» w potocznym jêzyku.",
        },
        {
          term: "Sesja",
          definition:
            "Aktywny okres pracy pracownika nad jednym zleceniem — od «Rozpocznij» do «Zakoñcz».",
        },
        {
          term: "Zlecenie",
          definition:
            "Zadanie zaplanowane przez dyspozytora lub utworzone przez pracownika; mo¿e mieæ wiele sesji w historii.",
        },
      ],
    },
  } satisfies HelpPageContent,

  platform: {
    title: "Instrukcja obs³ugi — konsola platformy",
    backLabel: "Powrót do organizacji",
    intro:
      "Konsola superadmina s³u¿y do zak³adania organizacji (tenantów), zarz¹dzania ich statusem i w³¹czania modu³ów funkcjonalnych.",
    userManual: "Podrêcznik superadmina",
    sections: [
      {
        id: "register",
        title: "1. Rejestracja organizacji",
        paragraphs: [
          "Formularz rejestracji tworzy now¹ organizacjê z unikalnym identyfikatorem (slug) i opcjonalnie konto administratora startowego.",
        ],
        bullets: [
          "Nazwa organizacji — wyœwietlana w panelu admina.",
          "Identyfikator (slug) — u¿ywany w logice multi-tenant; musi byæ unikalny.",
          "Konto admina — e-mail jako login, has³o pocz¹tkowe przeka¿ bezpiecznym kana³em.",
        ],
      },
      {
        id: "manage",
        title: "2. Zarz¹dzanie organizacjami",
        paragraphs: [
          "Tabela organizacji pokazuje wskaŸniki u¿ycia i pozwala edytowaæ dane oraz status.",
        ],
        bullets: [
          "Status aktywna — u¿ytkownicy mog¹ siê logowaæ.",
          "Status zawieszona — blokada dostêpu do organizacji.",
          "Dodawanie kolejnego administratora do istniej¹cej organizacji.",
        ],
      },
      {
        id: "feature-flags",
        title: "3. Ustawienia funkcji (feature flags)",
        paragraphs: [
          "Ka¿da organizacja mo¿e mieæ w³¹czone lub wy³¹czone modu³y niezale¿nie od innych.",
        ],
        bullets: [
          "Modu³ GPS i mapa — œledzenie pozycji, widok mapy, geofencing, planowanie trasy OSRM, nawigacja turn-by-turn.",
          "Modu³ utrzymania ruchu (DUR) — magazyn czêœci, typy zasobów, czêœci na zleceniach napraw.",
          "Zmiany zapisuj osobno dla ka¿dej organizacji — wp³ywaj¹ natychmiast na widocznoœæ menu.",
        ],
      },
      {
        id: "metrics",
        title: "4. WskaŸniki u¿ycia",
        paragraphs: [
          "Kolumny tabeli pomagaj¹ monitorowaæ adopcjê systemu.",
        ],
        bullets: [
          "Konta i pracownicy — liczba u¿ytkowników w organizacji.",
          "Sesje (30 dni) — aktywnoœæ terenowa.",
          "Zlecenia oczekuj¹ce — obci¹¿enie dyspozytorni.",
          "Logi urz¹dzeñ (7 dni) — wolumen diagnostyki z pola.",
        ],
      },
    ],
  } satisfies HelpPageContent,
} as const;
