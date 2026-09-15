# Data safety / Zasady dotyczące danych (Play Console)

Zaznacz **tak, zbieramy dane**. Brak sprzedaży danych, brak reklam, brak niezależnych analityk marketingowych.

| Typ w formularzu | Zbierane? | Udostępniane stronom trzecim? | Cel |
|------------------|-----------|-------------------------------|-----|
| Lokalizacja przybliżona i dokładna | Tak (w sesji) | Nie (tylko administratorzy tej samej organizacji) | Funkcje aplikacji |
| Dane osobowe (imię, login) | Tak | Nie | Konto |
| Zdjęcia z terenu | Tak (sesja) | Nie | Funkcje aplikacji |
| Dzienniki aplikacji / diagnostyka | Tak (`device_logs`) | Nie | Diagnostyka |
| Hasła | Nie na serwer w plaintext; hasz na koncie | — | — |
| Dane biometryczne | Nie — tylko odblokowanie poświadczeń na urządzeniu | — | — |

**Lokalizacja w tle:** tak, wyłącznie przy aktywnej sesji niestacjonarnej. W opisie użyj zdania z `/privacy-policy` (EN): *collects location data to enable tracking of employee routes during an active work session, even when the app is closed or not in use*.

**Usuwanie danych:** użytkownik / admin organizacji usuwa konto lub sesję w panelu; nie ma self-service „delete my account” w Sklepie — w Konsoli wskaż kontakt do administratora organizacji.

**Szyfrowanie w transporcie:** tak (HTTPS).
