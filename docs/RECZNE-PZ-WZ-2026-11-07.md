# Ręczne PZ/WZ — odporność na utratę odpowiedzi

2026-11-07, Werkit 1.9.4. Zakres: ręczne przyjęcia i wydania części oraz materiałów. Bez płatnej rozbudowy.

## Wynik

- Cztery API wymagają tożsamości konta i identyfikatora operacji. Trwałe potwierdzenie w `stock_movement_operations` jest atomowe z dokumentem i stanem magazynu. Ponowienie odtwarza wynik, również gdy stan zapasu zmienił się od pierwotnego wydania.
- Zmiana danych, rodzaju ruchu, magazynu lub właściciela pod tym samym kluczem daje konflikt. Nie tworzy kolejnego ruchu.
- Klient zapisuje dokładne dane oraz klucz w IndexedDB przed siecią. Restart zachowuje zapis. Zmiana konta go nie przejmuje ani nie usuwa. Panel pokazuje nieedytowalne szczegóły i przycisk „Ponów ten sam zapis”. Nie wysyła samoczynnie.
- Ponowienie z drugiej karty, która zachowała wcześniejszy zapis, nadal używa jego UUID, nawet jeżeli pierwsza karta już otrzymała potwierdzenie i usunęła lokalne oczekiwanie.
- Zamknięcie formularza nie usuwa nierozstrzygniętej operacji. Próba wysłania nowych danych na tym samym koncie i endpointcie jest zatrzymywana do rozliczenia poprzedniej.

## Dowody

1. 15 nowych testów klienta, API i panelu: trwały zapis, odtworzenie po ponownym załadowaniu modułu/montażu panelu, A → B → A, odmowa wysłania z innego konta, ponowienie z drugiej karty po potwierdzeniu, błędy storage, konflikt danych, brak nagłówków. Pełny zestaw: 896 testów w 152 plikach.
2. Dwa złożone testy integracyjne na izolowanym PostgreSQL 17, osobno dla części i materiałów. Po 12 równoczesnych PZ i 12 WZ z tym samym kluczem daje jeden dokument każdego rodzaju. Replay przy wyczerpanym zapasie odtwarza sukces. Zmienione dane/użytkownik/kierunek są odrzucane. Wymuszona awaria po zapisaniu dokumentu i stanu wycofuje transakcję razem z potwierdzeniem; ponowienie wykonuje ją poprawnie.
3. Osiem scenariuszy w rzeczywistym Chrome 157, na produkcyjnym buildzie Next.js i odizolowanej bazie: oba magazyny × PZ/WZ × utrata odpowiedzi po zatwierdzeniu albo zatrzymanie przed wysłaniem. Każdy obejmuje zamknięcie procesu przeglądarki, otwarcie tego samego profilu, A → B → A oraz ponowienie przez panel odzyskiwania. Kontrola niezależnie od UI porównuje dokumenty, potwierdzenia i stan bazy. Wszystkie PASS; szczegóły w `PILOT-MANUAL-STOCK-2026-11-07.json`.
4. Migracja `0039_stock_movement_operations` wykonana przez `db:migrate:pg` na bazie podłączonej do projektu; `db:verify-schema` OK. Na tej bazie nie wykonywano próbnych PZ/WZ. Próby mutacji odbyły się wyłącznie w lokalnym kontenerze z danymi syntetycznymi; z bazy źródłowej odczytano tylko schemat.

Podczas pierwszego testu integracyjnego porównanie zserializowanych odpowiedzi błędnie zależało od kolejności kluczy JSONB. Zmieniono je na porównanie struktury i wartości; nie osłabiono kontroli dokumentów ani stanu. W formularzu materiałów poprawiono też `finally`, aby odmowa zapisu nie pozostawiała przycisku zablokowanego.

## Granice

Testy w tej zmianie dotyczą Chrome, nie nowego przebiegu na fizycznym Androidzie ani Safari. Awaria odpowiedzi jest wstrzykiwana na granicy fetch po faktycznym zatwierdzeniu na serwerze. Nie testowano odłączania urządzenia od całej sieci. PZ/WZ nie są automatycznie synchronizowane offline; oczekujące żądanie należy świadomie ponowić. Usunięcie danych aplikacji przez użytkownika/system nadal może usunąć lokalne oczekiwanie, dlatego nie wolno wtedy tworzyć ruchu na nowo bez sprawdzenia dokumentów. Kopie bazy muszą obejmować nową tabelę potwierdzeń.

## Powtórzenie

`node scripts/pilot-browser-server.mjs --production --network-gateway --manual-stock` tworzy jednorazowy PostgreSQL, stosuje nową migrację na kopii schematu, uruchamia testy integracyjne i produkcyjny build. Następnie `node scripts/pilot-manual-stock-check.mjs` wykonuje osiem scenariuszy i zapisuje wynik w `.pilot-drill/manual-stock-browser-result.json`. Wymagane Docker oraz dotychczasowe narzędzia Playwright/Chrome. Po próbie plik `.pilot-drill/browser-stop` zatrzymuje własne procesy i usuwa własny kontener oraz wolumen. Profile testowe i robocze wyniki są poza Git.
